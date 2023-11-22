import { ContextType } from "../..";

export function get_user_context({}, context?: ContextType) {
  if (!context) return "No context available for this user";
  return JSON.stringify(context);
}
