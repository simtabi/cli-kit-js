/**
 * File loader for layered config.
 *
 * Reads:
 *   - `<configDir>/default.json`
 *   - `<configDir>/<env>.json`
 *   - `<configDir>/<env>.local.json`
 *   - `<configDir>/local.json`
 *
 * Path sandboxing: every resolved file path is verified to be inside the
 * resolved real-path of `configDir`. Symlink escape attempts are rejected.
 *
 * Size caps applied per-file and aggregate across all loaded layers.
 */

import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { JsonSizeError, PollutionError, safeParse } from './json'
import {
  type ConfigValidationError,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_TOTAL_BYTES,
  type SchemaLayer,
} from './types'

export interface LayerData {
  readonly layer: SchemaLayer
  readonly path: string | null
  readonly data: Readonly<Record<string, unknown>> | null
  readonly errors: readonly ConfigValidationError[]
}

export interface LoadOptions {
  readonly configDir: string
  readonly environment: string
  readonly maxFileBytes?: number
  readonly maxTotalBytes?: number
}

const PATH_TRAVERSAL = /\.\./

export async function loadLayers(opts: LoadOptions): Promise<readonly LayerData[]> {
  const maxFile = opts.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES
  const maxTotal = opts.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES

  // Resolve and realpath the config directory; we'll check every file lives
  // under the resolved root.
  let realRoot: string
  try {
    realRoot = await fs.realpath(opts.configDir)
  } catch {
    // configDir doesn't exist — return all empty layers
    return [
      emptyLayer('file:default'),
      emptyLayer('file:env'),
      emptyLayer('file:env.local'),
      emptyLayer('file:local'),
    ]
  }

  const env = opts.environment
  if (PATH_TRAVERSAL.test(env)) {
    return [
      emptyLayer('file:default'),
      emptyLayer('file:env'),
      emptyLayer('file:env.local'),
      emptyLayer('file:local'),
    ].map((l, i) =>
      i === 1
        ? {
            ...l,
            errors: [
              {
                code: 'INVALID_VALUE',
                path: '$',
                message: `environment name contains '..': ${env}`,
                layer: l.layer,
              },
            ],
          }
        : l,
    )
  }

  const files: Array<{ layer: SchemaLayer; name: string }> = [
    { layer: 'file:default', name: 'default.json' },
    { layer: 'file:env', name: `${env}.json` },
    { layer: 'file:env.local', name: `${env}.local.json` },
    { layer: 'file:local', name: 'local.json' },
  ]

  let totalBytes = 0
  const layers: LayerData[] = []
  for (const { layer, name } of files) {
    const result = await loadOne(realRoot, name, layer, maxFile)
    if (result.bytes > 0) {
      totalBytes += result.bytes
      if (totalBytes > maxTotal) {
        layers.push({
          layer,
          path: result.path,
          data: null,
          errors: [
            {
              code: 'INVALID_VALUE',
              path: '$',
              message: `aggregate config size exceeds ${maxTotal} bytes`,
              layer,
            },
          ],
        })
        continue
      }
    }
    layers.push({
      layer,
      path: result.path,
      data: result.data,
      errors: result.errors,
    })
  }
  return layers
}

function emptyLayer(layer: SchemaLayer): LayerData {
  return { layer, path: null, data: null, errors: [] }
}

interface LoadOneResult {
  readonly path: string | null
  readonly data: Readonly<Record<string, unknown>> | null
  readonly bytes: number
  readonly errors: readonly ConfigValidationError[]
}

async function loadOne(
  root: string,
  filename: string,
  layer: SchemaLayer,
  maxFileBytes: number,
): Promise<LoadOneResult> {
  const candidate = path.join(root, filename)
  let realPath: string
  try {
    realPath = await fs.realpath(candidate)
  } catch {
    return { path: null, data: null, bytes: 0, errors: [] }
  }

  // Sandbox: realpath must live under root
  const relative = path.relative(root, realPath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return {
      path: candidate,
      data: null,
      bytes: 0,
      errors: [
        {
          code: 'INVALID_VALUE',
          path: '$',
          message: `path escapes config dir: ${filename}`,
          layer,
        },
      ],
    }
  }

  let text: string
  try {
    text = await fs.readFile(realPath, 'utf8')
  } catch (e: unknown) {
    return {
      path: candidate,
      data: null,
      bytes: 0,
      errors: [
        {
          code: 'INVALID_VALUE',
          path: '$',
          message: e instanceof Error ? e.message : 'unreadable file',
          layer,
        },
      ],
    }
  }

  try {
    const parsed = safeParse(text, { maxBytes: maxFileBytes, path: filename })
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        path: candidate,
        data: null,
        bytes: text.length,
        errors: [
          {
            code: 'INVALID_VALUE',
            path: '$',
            message: `top-level value must be an object in ${filename}`,
            layer,
          },
        ],
      }
    }
    return {
      path: candidate,
      data: parsed as Record<string, unknown>,
      bytes: text.length,
      errors: [],
    }
  } catch (e: unknown) {
    let message = 'parse error'
    let code: ConfigValidationError['code'] = 'INVALID_VALUE'
    if (e instanceof PollutionError) {
      message = e.message
      code = 'POLLUTION_ATTEMPT'
    } else if (e instanceof JsonSizeError) {
      message = e.message
    } else if (e instanceof Error) {
      message = e.message
    }
    return {
      path: candidate,
      data: null,
      bytes: 0,
      errors: [
        {
          code,
          path: '$',
          message,
          layer,
        },
      ],
    }
  }
}
