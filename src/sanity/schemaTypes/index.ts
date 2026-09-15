import type { SchemaTypeDefinition } from "sanity";
import { siteSettings } from "./siteSettings";
import { project } from "./project";
import { experienceNode } from "./experienceNode";
import { record } from "./record";
import { beyondCategory } from "./beyondCategory";
import { beyondTheCode } from "./beyondTheCode";

/** Every document type the Studio knows about. */
export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  project,
  experienceNode,
  record,
  beyondCategory,
  beyondTheCode,
];
