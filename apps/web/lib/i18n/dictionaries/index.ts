import type { Locale } from "../config";
import { common as en_common } from "./en/common";
import { nav as en_nav } from "./en/nav";
import { landing as en_landing } from "./en/landing";
import { setup as en_setup } from "./en/setup";
import { interview as en_interview } from "./en/interview";
import { report as en_report } from "./en/report";
import { history as en_history } from "./en/history";
import { errors as en_errors } from "./en/errors";
import { common as pt_common } from "./pt/common";
import { nav as pt_nav } from "./pt/nav";
import { landing as pt_landing } from "./pt/landing";
import { setup as pt_setup } from "./pt/setup";
import { interview as pt_interview } from "./pt/interview";
import { report as pt_report } from "./pt/report";
import { history as pt_history } from "./pt/history";
import { errors as pt_errors } from "./pt/errors";
import { common as es_common } from "./es/common";
import { nav as es_nav } from "./es/nav";
import { landing as es_landing } from "./es/landing";
import { setup as es_setup } from "./es/setup";
import { interview as es_interview } from "./es/interview";
import { report as es_report } from "./es/report";
import { history as es_history } from "./es/history";
import { errors as es_errors } from "./es/errors";

const en = {
  common: en_common,
  nav: en_nav,
  landing: en_landing,
  setup: en_setup,
  interview: en_interview,
  report: en_report,
  history: en_history,
  errors: en_errors,
};

/** English is the source of truth; other locales must provide the same keys. */
export type Dictionary = typeof en;

const pt: Dictionary = {
  common: pt_common,
  nav: pt_nav,
  landing: pt_landing,
  setup: pt_setup,
  interview: pt_interview,
  report: pt_report,
  history: pt_history,
  errors: pt_errors,
};

const es: Dictionary = {
  common: es_common,
  nav: es_nav,
  landing: es_landing,
  setup: es_setup,
  interview: es_interview,
  report: es_report,
  history: es_history,
  errors: es_errors,
};

const dictionaries: Record<Locale, Dictionary> = { en, pt, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
