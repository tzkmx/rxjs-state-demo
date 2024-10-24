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

        it('should update quantity for existing items', () => {
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 2 });
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 3 });

            const { context } = actor.getSnapshot();
            expect(context.items.get('book')).toBe(5);
            expect(context.events).toHaveLength(2);
        });

        it('should remove items from the cart', () => {
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 2 });
            actor.send({ type: 'ITEM_REMOVED', item: 'book' });

            const { context } = actor.getSnapshot();
            expect(context.items.has('book')).toBe(false);
            expect(context.events).toHaveLength(2);
        });

        it('should handle multiple different items', () => {
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 2 });
            actor.send({ type: 'ITEM_ADDED', item: 'pen', quantity: 1 });

            const { context } = actor.getSnapshot();
            expect(context.items.get('book')).toBe(2);
            expect(context.items.get('pen')).toBe(1);
            expect(context.events).toHaveLength(2);
        });
    });

    describe('Order Processing', () => {
        it('should transition through order states correctly', () => {
            // Add item and submit order
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 1 });
            actor.send({ type: 'ORDER_SUBMITTED' });

            let snapshot = actor.getSnapshot();
            expect(snapshot.value).toBe('processing');
            expect(snapshot.context.status).toBe('processing');

            // Process payment
            actor.send({ type: 'PAYMENT_RECEIVED' });
            snapshot = actor.getSnapshot();
            expect(snapshot.value).toBe('shipping');
            expect(snapshot.context.status).toBe('shipping');

            // Complete order
            actor.send({ type: 'ORDER_SHIPPED' });
            snapshot = actor.getSnapshot();
            expect(snapshot.value).toBe('completed');
            expect(snapshot.context.status).toBe('completed');
        });

        it('should maintain cart items through state transitions', () => {
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 2 });
            actor.send({ type: 'ORDER_SUBMITTED' });

            const { context } = actor.getSnapshot();
            expect(context.items.get('book')).toBe(2);
        });
    });

    describe('Event History', () => {
        it('should maintain correct event history', () => {
            const events: OrderEvent[] = [
                { type: 'ITEM_ADDED', item: 'book', quantity: 2 },
                { type: 'ITEM_ADDED', item: 'pen', quantity: 1 },
                { type: 'ITEM_REMOVED', item: 'pen' },
                { type: 'ORDER_SUBMITTED' }
            ];

            events.forEach(event => actor.send(event));

            const { context } = actor.getSnapshot();
            expect(context.events).toEqual(events.slice(0, -1)); // ORDER_SUBMITTED doesn't get added to events
            expect(context.events).toHaveLength(3);
        });
    });

    describe('Invalid Transitions', () => {
        it('should not allow shipping before payment', () => {
            actor.send({ type: 'ORDER_SUBMITTED' });
            actor.send({ type: 'ORDER_SHIPPED' }); // Should not transition

            const snapshot = actor.getSnapshot();
            expect(snapshot.value).toBe('processing');
        });

        it('should not allow adding items after order submission', () => {
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 1 });
            actor.send({ type: 'ORDER_SUBMITTED' });
            actor.send({ type: 'ITEM_ADDED', item: 'pen', quantity: 1 });

            const { context } = actor.getSnapshot();
            expect(context.items.has('pen')).toBe(false);
            expect(context.items.size).toBe(1);
        });
    });

    describe('Final State', () => {
        it('should not accept any events in completed state', () => {
            // Progress to completed state
            actor.send({ type: 'ITEM_ADDED', item: 'book', quantity: 1 });
            actor.send({ type: 'ORDER_SUBMITTED' });
            actor.send({ type: 'PAYMENT_RECEIVED' });
            actor.send({ type: 'ORDER_SHIPPED' });

            // Try to modify the completed order
            actor.send({ type: 'ITEM_ADDED', item: 'pen', quantity: 1 });

            const snapshot = actor.getSnapshot();
            expect(snapshot.value).toBe('completed');
            expect(snapshot.context.items.has('pen')).toBe(false);
        });
    });
});