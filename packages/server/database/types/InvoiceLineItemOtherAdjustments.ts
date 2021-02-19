import InvoiceLineItem from './InvoiceLineItem'
import {InvoiceLineItemEnum} from '~/__generated__/InvoiceLineItem_item.graphql'

interface Input {
  amount: number
  description?: string | null
  quantity: number
}

export default class InvoiceLineItemOtherAdjustments extends InvoiceLineItem {
  details = []
  type = 'OTHER_ADJUSTMENTS' as InvoiceLineItemEnum
  constructor(input: Input) {
    super({...input, type: 'OTHER_ADJUSTMENTS'})
  }
}
