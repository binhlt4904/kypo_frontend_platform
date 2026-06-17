import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { switchMap } from 'rxjs/operators';
import { Pool } from '@crczp/sandbox-model';
import { PoolOverviewService } from '../../state/pool-overview.service';
import { PoolSort } from '@crczp/sandbox-api';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { ResourceLimitService } from '@crczp/sandbox-agenda/resource-limit';

@Injectable()
export class PoolService {
    protected poolsHasErrorSubject$: BehaviorSubject<boolean> =
        new BehaviorSubject(false);
    poolsHasError$: Observable<boolean> =
        this.poolsHasErrorSubject$.asObservable();
    private poolOverviewService = inject(PoolOverviewService);
    private resourceLimitService = inject(ResourceLimitService);
    pools$: Observable<OffsetPaginatedResource<Pool>> =
        this.poolOverviewService.resource$;
    private lastPagination: OffsetPaginationEvent<PoolSort>;
    private lastFilter: string;

    /**
     * Gets all pools with passed pagination.
     * @param pagination requested pagination
     * @param filter optional filter string
     */
    getAll(pagination: OffsetPaginationEvent<PoolSort>, filter?: string): Observable<any> {
        this.lastPagination = pagination;
        this.lastFilter = filter;
        return this.poolOverviewService.getAll(pagination, filter);
    }

    /**
     * Starts a sandbox instance allocation, informs about the result and updates list of pools or handles an error
     * @param pool a pool to be allocated with sandbox instances
     * @param count number of sandbox instances to be allocated
     */
    allocate(pool: Pool, count: number): Observable<any> {
        return this.poolOverviewService
            .allocate(pool, count)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    /**
     * Deletes a pool, informs about the result and updates list of pools or handles an error
     * @param pool a pool to be deleted
     */
    delete(pool: Pool): Observable<any> {
        return this.poolOverviewService
            .delete(pool)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    /**
     * Clears a pool by deleting all associated sandbox instances, informs about the result and updates list of pools or handles an error
     * @param pool a pool to be cleared
     */
    clear(pool: Pool): Observable<any> {
        return this.poolOverviewService
            .clear(pool)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    create(): Observable<any> {
        return this.poolOverviewService
            .create()
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    lock(pool: Pool): Observable<any> {
        return this.poolOverviewService
            .lock(pool)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    getSshAccess(poolId: number): Observable<boolean> {
        return this.poolOverviewService.getSshAccess(poolId);
    }

    unlock(pool: Pool): Observable<any> {
        return this.poolOverviewService
            .unlock(pool)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    updatePool(pool: Pool): Observable<any> {
        return this.poolOverviewService
            .edit(pool)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    updateComment(pool: Pool): Observable<any> {
        return this.poolOverviewService
            .updateComment(pool)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }

    toggleResourceLimit(pool: Pool): Observable<any> {
        return this.resourceLimitService
            .toggleResourceLimit(pool.id)
            .pipe(switchMap(() => this.getAll(this.lastPagination, this.lastFilter)));
    }
}
