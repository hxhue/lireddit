import { FieldError } from "../generated/graphql";

export const toErrorMap = (errors: FieldError[]) => {
  const errorMap: Record<string, string> = {};
  for (const {field, message} of errors) {
    if (!errorMap[field]) {
      errorMap[field] = message + '.';
    } else {
      errorMap[field] = errorMap[field] + ' ' + message + '.';
    }
  }
  return errorMap;
}