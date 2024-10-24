import {
    from,
    Observable,
    distinctUntilChanged,
    map, shareReplay, pipe, BehaviorSubject
} from 'rxjs';
import {
    fromObservable,
    AnyActorLogic,
    ContextFrom,
    createActor,
    EventFromLogic,
    SnapshotFrom, StateValueFrom
} from "xstate";

export class ObservableStore<
    TMachine extends AnyActorLogic
> {
    private state$: BehaviorSubject<SnapshotFrom<TMachine>>;
    private actor: ReturnType<typeof createActor<TMachine>>;

    constructor(
        machine: TMachine
    ) {
        this.actor = createActor(machine);
        this.state$ = new BehaviorSubject({} as unknown as SnapshotFrom<TMachine>)
        this.actor.subscribe(this.state$);
    }

    // Start the actor
    public start(): void {
        this.actor.start();
    }

    // Stop the actor
    public stop(): void {
        this.actor.stop();
    }

    // Send events to the machine
    public send(event: EventFromLogic<TMachine>): void {
        this.actor.send(event);
    }

    // Get current state snapshot
    public getSnapshot() {
        return this.state$.getValue();
    }

    // Get the full state stream
    public select(): Observable<ContextFrom<TMachine>>;

    // Select a specific part of the context
    public select<K extends keyof ContextFrom<TMachine>>(
        selector: K
    ): Observable<ContextFrom<TMachine>[K]>;

    // Select with a mapping function
    public select<R>(
        selector: (state: ContextFrom<TMachine>) => R
    ): Observable<R>;

    // Implementation of select overloads
    public select<K extends keyof ContextFrom<TMachine>, R>(
        selector?: K | ((state: ContextFrom<TMachine>) => R)
    ): Observable<ContextFrom<TMachine> | ContextFrom<TMachine>[K] | R> {
        if (!selector) {
            return this.state$;
        }

        return this.state$.pipe(
            map(state => {
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state[selector];
            }),
            distinctUntilChanged()
        );
    }

    // Select multiple context properties at once
    public selectMany<K extends keyof ContextFrom<TMachine>>(
        selectors: K[]
    ): Observable<Pick<ContextFrom<TMachine>, K>> {
        return this.state$.pipe(
            map(state => {
                const result = {} as Pick<ContextFrom<TMachine>, K>;
                selectors.forEach(key => {
                    result[key] = state[key];
                });
                return result;
            }),
            distinctUntilChanged((prev, curr) => {
                return selectors.every(key => prev[key] === curr[key]);
            })
        );
    }

    // Get current state value
    public getState() {
        return this.getSnapshot().value;
    }
}
