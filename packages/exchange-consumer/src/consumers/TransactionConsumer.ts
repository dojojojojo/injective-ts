import { GrpcException } from '@injectivelabs/exceptions'
import {
  PrepareTxRequest,
  PrepareTxResponse,
  BroadcastTxRequest,
  BroadcastTxResponse,
  CosmosTxFee,
  CosmosPubKey,
} from '@injectivelabs/exchange-api/injective_exchange_rpc_pb'
import { Coin } from '@injectivelabs/chain-api/cosmos/base/v1beta1/coin_pb'
import { InjectiveExchangeRPC } from '@injectivelabs/exchange-api/injective_exchange_rpc_pb_service'
import { ChainId, AccountAddress } from '@injectivelabs/ts-types'
import { recoverTypedSignaturePubKey } from '@injectivelabs/tx-utils'
import {
  DEFAULT_GAS_LIMIT,
  DEFAULT_EXCHANGE_LIMIT,
  DEFAULT_BRIDGE_FEE_DENOM,
  DEFAULT_BRIDGE_FEE_PRICE,
} from '@injectivelabs/utils'
import BaseConsumer from '../BaseConsumer'

export class TransactionConsumer extends BaseConsumer {
  async prepareTxRequest({
    address,
    chainId,
    message,
    gasLimit = DEFAULT_GAS_LIMIT,
    feeDenom = DEFAULT_BRIDGE_FEE_DENOM,
    feePrice = DEFAULT_BRIDGE_FEE_PRICE,
  }: {
    address: AccountAddress
    chainId: ChainId
    message: any
    gasLimit?: number
    feeDenom?: string
    feePrice?: string
  }) {
    const txFeeAmount = new Coin()
    txFeeAmount.setDenom(feeDenom)
    txFeeAmount.setAmount(feePrice)

    const cosmosTxFee = new CosmosTxFee()
    cosmosTxFee.setGas(gasLimit)
    cosmosTxFee.setPriceList([txFeeAmount])

    const prepareTxRequest = new PrepareTxRequest()
    prepareTxRequest.setChainId(chainId)
    prepareTxRequest.setSignerAddress(address)
    prepareTxRequest.setFee(cosmosTxFee)
    prepareTxRequest.addMsgs(Buffer.from(JSON.stringify(message), 'utf8'))

    try {
      const response = await this.request<
        PrepareTxRequest,
        PrepareTxResponse,
        typeof InjectiveExchangeRPC.PrepareTx
      >(prepareTxRequest, InjectiveExchangeRPC.PrepareTx)

      return response
    } catch (e) {
      throw new GrpcException(e.message)
    }
  }

  async prepareExchangeTxRequest({
    address,
    chainId,
    message,
    gasLimit = DEFAULT_EXCHANGE_LIMIT,
    feeDenom = DEFAULT_BRIDGE_FEE_DENOM,
    feePrice = DEFAULT_BRIDGE_FEE_PRICE,
    delegatedFee,
  }: {
    address: AccountAddress
    chainId: ChainId
    message: any
    gasLimit?: number
    feeDenom?: string
    feePrice?: string
    delegatedFee?: boolean
  }) {
    const txFeeAmount = new Coin()
    txFeeAmount.setDenom(feeDenom)
    txFeeAmount.setAmount(feePrice)

    const cosmosTxFee = new CosmosTxFee()
    cosmosTxFee.setGas(gasLimit)
    cosmosTxFee.setPriceList([txFeeAmount])

    if (delegatedFee) {
      cosmosTxFee.setDelegateFee(delegatedFee)
    }

    const prepareTxRequest = new PrepareTxRequest()
    prepareTxRequest.setChainId(chainId)
    prepareTxRequest.setSignerAddress(address)
    prepareTxRequest.setFee(cosmosTxFee)
    prepareTxRequest.addMsgs(Buffer.from(JSON.stringify(message), 'utf8'))

    try {
      const response = await this.request<
        PrepareTxRequest,
        PrepareTxResponse,
        typeof InjectiveExchangeRPC.PrepareTx
      >(prepareTxRequest, InjectiveExchangeRPC.PrepareTx)

      return response
    } catch (e) {
      throw new GrpcException(e.message)
    }
  }

  async broadcastTxRequest({
    signature,
    chainId,
    message,
    txResponse,
  }: {
    signature: string
    chainId: ChainId
    txResponse: PrepareTxResponse
    message: Record<string, any>
  }) {
    const parsedTypedData = JSON.parse(txResponse.getData())
    const publicKeyHex = recoverTypedSignaturePubKey(parsedTypedData, signature)

    const cosmosPubKey = new CosmosPubKey()
    cosmosPubKey.setType(txResponse.getPubKeyType())
    cosmosPubKey.setKey(publicKeyHex)

    parsedTypedData.message.msgs = null

    const broadcastTxRequest = new BroadcastTxRequest()
    broadcastTxRequest.setMode('block')
    broadcastTxRequest.setChainId(chainId)
    broadcastTxRequest.setPubKey(cosmosPubKey)
    broadcastTxRequest.setSignature(signature)
    broadcastTxRequest.setTx(
      Buffer.from(JSON.stringify(parsedTypedData.message), 'utf8'),
    )
    broadcastTxRequest.setFeePayer(txResponse.getFeePayer())
    broadcastTxRequest.setFeePayerSig(txResponse.getFeePayerSig())
    broadcastTxRequest.setMsgsList([
      Buffer.from(JSON.stringify(message), 'utf8'),
    ])

    try {
      const response = await this.request<
        BroadcastTxRequest,
        BroadcastTxResponse,
        typeof InjectiveExchangeRPC.BroadcastTx
      >(broadcastTxRequest, InjectiveExchangeRPC.BroadcastTx)

      return response.toObject()
    } catch (e) {
      throw new GrpcException(e.message)
    }
  }
}
