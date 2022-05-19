import {
  IJsonRpcRequest,
  IJsonRpcResponseSuccess,
  IJsonRpcResponseError,
  IJsonRpcMessage,
  IJsonRpcResponse,
  WSMessage,
} from '@deficonnect/types'
import { signingMethods } from './constants'

export function isWSMessage(object: any): object is WSMessage {
  return (
    !!object &&
    typeof object.type !== 'undefined' &&
    typeof object.topic !== 'undefined' &&
    typeof object.payload !== 'undefined'
  )
}

export function isJsonRpcRequest(object: any): object is IJsonRpcRequest {
  return object
    && typeof object.method !== 'undefined'
    && typeof object.id !== 'undefined'
    && typeof object.jsonrpc !== 'undefined'
}

export function isJsonRpcResponseSuccess(object: any): object is IJsonRpcResponseSuccess {
  return object
    && typeof object.result !== 'undefined'
    && typeof object.id !== 'undefined'
    && typeof object.jsonrpc !== 'undefined'
}

export function isJsonRpcResponseError(object: any): object is IJsonRpcResponseError {
  return object
    && typeof object.error !== 'undefined'
    && typeof object.id !== 'undefined'
    && typeof object.jsonrpc !== 'undefined'
}

export function isJsonRpcResponse(object: any): object is IJsonRpcResponse {
  return isJsonRpcResponseSuccess(object) || isJsonRpcResponseError(object)
}

export function isJsonRpcMessage(object: any): object is IJsonRpcMessage {
  return isJsonRpcRequest(object) || isJsonRpcResponse(object)
}


export function isSilentPayload(request: IJsonRpcRequest): boolean {
  if (request.method.startsWith('dc_')) {
    return true
  }
  if (signingMethods.includes(request.method)) {
    return false
  }
  return true
}
