import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { orderMachine } from './order-machine';

describe('Order Machine', () => {
    let actor: ReturnType<typeof createActor<typeof orderMachine>>;

    beforeEach(() => {
        actor = createActor(orderMachine);
        actor.start();
    });

    describe('Initial State', () => {
        it('should start in idle state with empty context', () => {
            const snapshot = actor.getSnapshot();

            expect(snapshot.value).toBe('idle');
            expect(snapshot.context).toEqual({
                items: new Map(),
                total: 0,
                status: 'pending',
                events: []
            });
        });
    });

    describe('Item Management', () => {
        it('should add items to the cart', () => {
            actor.send({type: 'ITEM_ADDED', item: 'book', quantity: 2});

            const {context} = actor.getSnapshot();
            expect(context.items.get('book')).toBe(2);
            expect(context.events).toHaveLength(1);
        });
    });
});