import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AlertsResult, ErrorResponse, Event, GlobalSearchParams, HealthStatus, HomepageData, ListActivitiesParams, ListAlertsParams, ListCalendarEventsParams, ListEventsParams, ListMeetingsParams, ListVolunteerParams, Meeting, MeetingsResult, SearchResults, Source, SubmitItemInput, SubmitResult, SubscribeInput, SubscribeResult, VolunteerOpportunity } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetHomepageUrl: () => string;
/**
 * @summary Get homepage data
 */
export declare const getHomepage: (options?: RequestInit) => Promise<HomepageData>;
export declare const getGetHomepageQueryKey: () => readonly ["/api/homepage"];
export declare const getGetHomepageQueryOptions: <TData = Awaited<ReturnType<typeof getHomepage>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getHomepage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getHomepage>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetHomepageQueryResult = NonNullable<Awaited<ReturnType<typeof getHomepage>>>;
export type GetHomepageQueryError = ErrorType<unknown>;
/**
 * @summary Get homepage data
 */
export declare function useGetHomepage<TData = Awaited<ReturnType<typeof getHomepage>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getHomepage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListEventsUrl: (params?: ListEventsParams) => string;
/**
 * @summary List events
 */
export declare const listEvents: (params?: ListEventsParams, options?: RequestInit) => Promise<Event[]>;
export declare const getListEventsQueryKey: (params?: ListEventsParams) => readonly ["/api/events", ...ListEventsParams[]];
export declare const getListEventsQueryOptions: <TData = Awaited<ReturnType<typeof listEvents>>, TError = ErrorType<unknown>>(params?: ListEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listEvents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListEventsQueryResult = NonNullable<Awaited<ReturnType<typeof listEvents>>>;
export type ListEventsQueryError = ErrorType<unknown>;
/**
 * @summary List events
 */
export declare function useListEvents<TData = Awaited<ReturnType<typeof listEvents>>, TError = ErrorType<unknown>>(params?: ListEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetEventUrl: (id: string) => string;
/**
 * @summary Get event by ID
 */
export declare const getEvent: (id: string, options?: RequestInit) => Promise<Event>;
export declare const getGetEventQueryKey: (id: string) => readonly [`/api/events/${string}`];
export declare const getGetEventQueryOptions: <TData = Awaited<ReturnType<typeof getEvent>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEvent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getEvent>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetEventQueryResult = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
export type GetEventQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get event by ID
 */
export declare function useGetEvent<TData = Awaited<ReturnType<typeof getEvent>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEvent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListActivitiesUrl: (params?: ListActivitiesParams) => string;
/**
 * @summary List activity events
 */
export declare const listActivities: (params?: ListActivitiesParams, options?: RequestInit) => Promise<Event[]>;
export declare const getListActivitiesQueryKey: (params?: ListActivitiesParams) => readonly ["/api/activities", ...ListActivitiesParams[]];
export declare const getListActivitiesQueryOptions: <TData = Awaited<ReturnType<typeof listActivities>>, TError = ErrorType<unknown>>(params?: ListActivitiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listActivities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listActivities>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListActivitiesQueryResult = NonNullable<Awaited<ReturnType<typeof listActivities>>>;
export type ListActivitiesQueryError = ErrorType<unknown>;
/**
 * @summary List activity events
 */
export declare function useListActivities<TData = Awaited<ReturnType<typeof listActivities>>, TError = ErrorType<unknown>>(params?: ListActivitiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listActivities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListCalendarEventsUrl: (params?: ListCalendarEventsParams) => string;
/**
 * @summary List events for calendar view
 */
export declare const listCalendarEvents: (params?: ListCalendarEventsParams, options?: RequestInit) => Promise<Event[]>;
export declare const getListCalendarEventsQueryKey: (params?: ListCalendarEventsParams) => readonly ["/api/calendar-events", ...ListCalendarEventsParams[]];
export declare const getListCalendarEventsQueryOptions: <TData = Awaited<ReturnType<typeof listCalendarEvents>>, TError = ErrorType<unknown>>(params?: ListCalendarEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCalendarEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCalendarEvents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCalendarEventsQueryResult = NonNullable<Awaited<ReturnType<typeof listCalendarEvents>>>;
export type ListCalendarEventsQueryError = ErrorType<unknown>;
/**
 * @summary List events for calendar view
 */
export declare function useListCalendarEvents<TData = Awaited<ReturnType<typeof listCalendarEvents>>, TError = ErrorType<unknown>>(params?: ListCalendarEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCalendarEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListAlertsUrl: (params?: ListAlertsParams) => string;
/**
 * @summary List alerts
 */
export declare const listAlerts: (params?: ListAlertsParams, options?: RequestInit) => Promise<AlertsResult>;
export declare const getListAlertsQueryKey: (params?: ListAlertsParams) => readonly ["/api/alerts", ...ListAlertsParams[]];
export declare const getListAlertsQueryOptions: <TData = Awaited<ReturnType<typeof listAlerts>>, TError = ErrorType<unknown>>(params?: ListAlertsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAlerts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAlerts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAlertsQueryResult = NonNullable<Awaited<ReturnType<typeof listAlerts>>>;
export type ListAlertsQueryError = ErrorType<unknown>;
/**
 * @summary List alerts
 */
export declare function useListAlerts<TData = Awaited<ReturnType<typeof listAlerts>>, TError = ErrorType<unknown>>(params?: ListAlertsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAlerts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListMeetingsUrl: (params?: ListMeetingsParams) => string;
/**
 * @summary List meetings
 */
export declare const listMeetings: (params?: ListMeetingsParams, options?: RequestInit) => Promise<MeetingsResult>;
export declare const getListMeetingsQueryKey: (params?: ListMeetingsParams) => readonly ["/api/meetings", ...ListMeetingsParams[]];
export declare const getListMeetingsQueryOptions: <TData = Awaited<ReturnType<typeof listMeetings>>, TError = ErrorType<unknown>>(params?: ListMeetingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMeetings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMeetings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMeetingsQueryResult = NonNullable<Awaited<ReturnType<typeof listMeetings>>>;
export type ListMeetingsQueryError = ErrorType<unknown>;
/**
 * @summary List meetings
 */
export declare function useListMeetings<TData = Awaited<ReturnType<typeof listMeetings>>, TError = ErrorType<unknown>>(params?: ListMeetingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMeetings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMeetingUrl: (id: string) => string;
/**
 * @summary Get meeting by ID
 */
export declare const getMeeting: (id: string, options?: RequestInit) => Promise<Meeting>;
export declare const getGetMeetingQueryKey: (id: string) => readonly [`/api/meetings/${string}`];
export declare const getGetMeetingQueryOptions: <TData = Awaited<ReturnType<typeof getMeeting>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMeeting>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMeeting>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeetingQueryResult = NonNullable<Awaited<ReturnType<typeof getMeeting>>>;
export type GetMeetingQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get meeting by ID
 */
export declare function useGetMeeting<TData = Awaited<ReturnType<typeof getMeeting>>, TError = ErrorType<ErrorResponse>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMeeting>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListVolunteerUrl: (params?: ListVolunteerParams) => string;
/**
 * @summary List volunteer opportunities
 */
export declare const listVolunteer: (params?: ListVolunteerParams, options?: RequestInit) => Promise<VolunteerOpportunity[]>;
export declare const getListVolunteerQueryKey: (params?: ListVolunteerParams) => readonly ["/api/volunteer", ...ListVolunteerParams[]];
export declare const getListVolunteerQueryOptions: <TData = Awaited<ReturnType<typeof listVolunteer>>, TError = ErrorType<unknown>>(params?: ListVolunteerParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVolunteer>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listVolunteer>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListVolunteerQueryResult = NonNullable<Awaited<ReturnType<typeof listVolunteer>>>;
export type ListVolunteerQueryError = ErrorType<unknown>;
/**
 * @summary List volunteer opportunities
 */
export declare function useListVolunteer<TData = Awaited<ReturnType<typeof listVolunteer>>, TError = ErrorType<unknown>>(params?: ListVolunteerParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVolunteer>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListSourcesUrl: () => string;
/**
 * @summary List public sources
 */
export declare const listSources: (options?: RequestInit) => Promise<Source[]>;
export declare const getListSourcesQueryKey: () => readonly ["/api/sources"];
export declare const getListSourcesQueryOptions: <TData = Awaited<ReturnType<typeof listSources>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSources>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSources>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSourcesQueryResult = NonNullable<Awaited<ReturnType<typeof listSources>>>;
export type ListSourcesQueryError = ErrorType<unknown>;
/**
 * @summary List public sources
 */
export declare function useListSources<TData = Awaited<ReturnType<typeof listSources>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSources>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGlobalSearchUrl: (params?: GlobalSearchParams) => string;
/**
 * @summary Global search across all content
 */
export declare const globalSearch: (params?: GlobalSearchParams, options?: RequestInit) => Promise<SearchResults>;
export declare const getGlobalSearchQueryKey: (params?: GlobalSearchParams) => readonly ["/api/search", ...GlobalSearchParams[]];
export declare const getGlobalSearchQueryOptions: <TData = Awaited<ReturnType<typeof globalSearch>>, TError = ErrorType<unknown>>(params?: GlobalSearchParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof globalSearch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof globalSearch>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GlobalSearchQueryResult = NonNullable<Awaited<ReturnType<typeof globalSearch>>>;
export type GlobalSearchQueryError = ErrorType<unknown>;
/**
 * @summary Global search across all content
 */
export declare function useGlobalSearch<TData = Awaited<ReturnType<typeof globalSearch>>, TError = ErrorType<unknown>>(params?: GlobalSearchParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof globalSearch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSubmitItemUrl: () => string;
/**
 * @summary Submit a community item
 */
export declare const submitItem: (submitItemInput: SubmitItemInput, options?: RequestInit) => Promise<SubmitResult>;
export declare const getSubmitItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitItem>>, TError, {
        data: BodyType<SubmitItemInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitItem>>, TError, {
    data: BodyType<SubmitItemInput>;
}, TContext>;
export type SubmitItemMutationResult = NonNullable<Awaited<ReturnType<typeof submitItem>>>;
export type SubmitItemMutationBody = BodyType<SubmitItemInput>;
export type SubmitItemMutationError = ErrorType<unknown>;
/**
* @summary Submit a community item
*/
export declare const useSubmitItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitItem>>, TError, {
        data: BodyType<SubmitItemInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitItem>>, TError, {
    data: BodyType<SubmitItemInput>;
}, TContext>;
export declare const getSubscribeUrl: () => string;
/**
 * @summary Subscribe to the weekly digest
 */
export declare const subscribe: (subscribeInput: SubscribeInput, options?: RequestInit) => Promise<SubscribeResult>;
export declare const getSubscribeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof subscribe>>, TError, {
        data: BodyType<SubscribeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof subscribe>>, TError, {
    data: BodyType<SubscribeInput>;
}, TContext>;
export type SubscribeMutationResult = NonNullable<Awaited<ReturnType<typeof subscribe>>>;
export type SubscribeMutationBody = BodyType<SubscribeInput>;
export type SubscribeMutationError = ErrorType<unknown>;
/**
* @summary Subscribe to the weekly digest
*/
export declare const useSubscribe: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof subscribe>>, TError, {
        data: BodyType<SubscribeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof subscribe>>, TError, {
    data: BodyType<SubscribeInput>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map