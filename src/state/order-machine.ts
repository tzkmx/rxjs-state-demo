
// Example usage with our previous order machine
import { assign, setup } from 'xstate';

// Example usage with XState v5
export interface OrderContext {
    items: Map<string, number>;
    total: number;
    status: string;
    events: OrderEvent[];
}

export type OrderEvent =
    | { type: 'ITEM_ADDED'; item: string; quantity: number }
    | { type: 'ITEM_REMOVED'; item: string }
    | { type: 'ORDER_SUBMITTED' }
    | { type: 'PAYMENT_RECEIVED' }
    | { type: 'ORDER_SHIPPED' };

export const orderMachine = setup({
    types: {} as {
        context: OrderContext;
        events: OrderEvent;
    },
    actions: {}
}).createMachine({
    id: 'order',
    initial: 'idle',
    context: {
        items: new Map(),
        total: 0,
        status: 'pending',
        events: []
    },
    states: {
        idle: {
            on: {
                ITEM_ADDED: {
                    actions: assign(({ context, event }) => ({
                        items: (() => {
                            const newItems = new Map(context.items);
                            newItems.set(event.item, (newItems.get(event.item) || 0) + event.quantity);
                            return newItems;
                        })(),
                        events: [...context.events, event]
                    }))
                },
                ITEM_REMOVED: {
                    actions: assign(({ context, event }) => ({
                        items: (() => {
                            const newItems = new Map(context.items);
                            newItems.delete(event.item);
                            return newItems;
                        })(),
                        events: [...context.events, event]
                    }))
                },
                ORDER_SUBMITTED: {
                    target: 'processing'
                }
            }
        },
        processing: {
            entry: assign({ status: 'processing' }),
            on: {
                PAYMENT_RECEIVED: {
                    target: 'shipping'
                }
            }
        },
        shipping: {
            entry: assign({ status: 'shipping' }),
            on: {
                ORDER_SHIPPED: {
                    target: 'completed'
                }
            }
        },
        completed: {
            entry: assign({ status: 'completed' }),
            type: 'final'
        }
    }
});