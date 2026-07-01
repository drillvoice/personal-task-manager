import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Task Manager",
    short_name: "Tasks",
    description: "Personal GTD task and project manager.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eeeee7",
    theme_color: "#eeeee7",
    // Icons intentionally empty in v1 — see initial-setup.md §6 for how to
    // generate 192/512/maskable PNGs and drop them into public/icons/.
    icons: [],
  };
}
