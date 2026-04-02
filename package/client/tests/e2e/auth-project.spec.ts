import { test, expect } from "@playwright/test";
import { cleanupUsersByEmail, prisma, seedViewerProject } from "./helpers/db";

test.afterAll(async () => {
  await cleanupUsersByEmail([
    "owner.e2e@codesync.test",
    "viewer.e2e@codesync.test",
  ]);
  await prisma.$disconnect();
});

test("signup, login, create project, create file, and edit file", async ({ page }) => {
  const uniqueId = Date.now();
  const email = `e2e.user.${uniqueId}@codesync.test`;
  const password = "password123";
  const projectName = `E2E Project ${uniqueId}`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

  await page.getByLabel("Project name").fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await page.getByRole("link", { name: "Open workspace" }).click();

  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { name: "Project Editor" })).toBeVisible();

  await page.getByPlaceholder("File name").fill("index.ts");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("button", { name: /index.ts/i })).toBeVisible();
  await page.getByRole("button", { name: /index.ts/i }).click();

  const monacoInput = page.locator(".monaco-editor textarea").first();
  await monacoInput.click();
  await monacoInput.press("ControlOrMeta+A");
  await monacoInput.type("export const status = 'ok';", { delay: 20 });

  await expect(page.getByText("Saved")).toBeVisible();

  await cleanupUsersByEmail([email]);
});

test("viewer cannot create files or edit project structure", async ({ page }) => {
  const seeded = await seedViewerProject();

  await page.goto("/login");
  await page.getByLabel("Email").fill(seeded.viewerEmail);
  await page.getByLabel("Password").fill(seeded.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/dashboard");
  await page.goto(`/projects/${seeded.projectId}`);

  await expect(page.getByText("View only")).toBeVisible();
  await expect(page.getByPlaceholder("File name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
  await expect(page.getByText("You have view-only access to this project.")).toBeVisible();
});
