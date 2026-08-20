import {
  CITY_FILTERS,
  COUNTY_FILTERS,
  SUBMISSION_TYPE_OPTIONS,
} from "@/lib/hub-constants";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";

export type SubmissionContext = {
  city?: string;
  county?: string;
  submissionType?: string;
};

function isAllowedValue(
  value: string | undefined,
  allowed: readonly string[],
): value is string {
  return typeof value === "string" && allowed.includes(value);
}

/** Only carries known filter values into a public submission form. */
export function parseSubmissionContext(
  params: SearchParamsRecord,
): SubmissionContext {
  const city = readSearchParam(params, "city");
  const county = readSearchParam(params, "county");
  const submissionType = readSearchParam(params, "submissionType");
  const allowedSubmissionTypes = SUBMISSION_TYPE_OPTIONS.map(
    (option) => option.value,
  );

  return {
    ...(isAllowedValue(city, CITY_FILTERS) ? { city } : {}),
    ...(isAllowedValue(county, COUNTY_FILTERS) ? { county } : {}),
    ...(isAllowedValue(submissionType, allowedSubmissionTypes)
      ? { submissionType }
      : {}),
  };
}

export function buildSubmissionHref(context: SubmissionContext) {
  const query = new URLSearchParams();

  if (context.city && isAllowedValue(context.city, CITY_FILTERS)) {
    query.set("city", context.city);
  }

  if (context.county && isAllowedValue(context.county, COUNTY_FILTERS)) {
    query.set("county", context.county);
  }

  if (
    context.submissionType &&
    SUBMISSION_TYPE_OPTIONS.some(
      (option) => option.value === context.submissionType,
    )
  ) {
    query.set("submissionType", context.submissionType);
  }

  const search = query.toString();
  return search ? `/submit?${search}` : "/submit";
}
