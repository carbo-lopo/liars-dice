import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Globals are off, so Testing Library can't register its own cleanup.
afterEach(() => cleanup());
