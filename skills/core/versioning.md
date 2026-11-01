{
  "name": "storefront-vitrine-skill-kit",
  "version": "1.0.0",
  "status": "active",
  "description": "Modular reusable skill package for cross-project delivery and fast project vitrine access.",
  "layers": [
    {
      "name": "core",
      "purpose": "Reusable technical decision-making and standards"
    },
    {
      "name": "stack-adapters",
      "purpose": "Framework-specific implementations for Node, Express, Mongo, frontend, deployment"
    },
    {
      "name": "vitrine",
      "purpose": "Registry, capability map, release view, and project overview"
    }
  ],
  "skills": [
    {
      "slug": "architecture",
      "title": "Architecture & modular boundaries",
      "category": "core",
      "tags": ["architecture", "modular", "design"],
      "entry": "skills/modules/architecture.md"
    },
    {
      "slug": "backend",
      "title": "Backend delivery",
      "category": "core",
      "tags": ["backend", "api", "service"],
      "entry": "skills/modules/backend.md"
    },
    {
      "slug": "frontend",
      "title": "Frontend delivery",
      "category": "core",
      "tags": ["frontend", "ui", "client"],
      "entry": "skills/modules/frontend.md"
    },
    {
      "slug": "data",
      "title": "Data & persistence",
      "category": "core",
      "tags": ["mongodb", "mongoose", "db"],
      "entry": "skills/modules/data.md"
    },
    {
      "slug": "security",
      "title": "Security & access control",
      "category": "core",
      "tags": ["auth", "rbac", "security"],
      "entry": "skills/modules/security.md"
    },
    {
      "slug": "devops",
      "title": "DevOps & delivery",
      "category": "core",
      "tags": ["devops", "ci", "deploy"],
      "entry": "skills/modules/devops.md"
    },
    {
      "slug": "release",
      "title": "Release & versioning",
      "category": "core",
      "tags": ["versioning", "release", "changelog"],
      "entry": "skills/modules/release.md"
    },
    {
      "slug": "cache",
      "title": "Caching & invalidation",
      "category": "core",
      "tags": ["cache", "performance", "invalidation"],
      "entry": "skills/core/cache-system.md"
    },
    {
      "slug": "vitrine",
      "title": "Project vitrine & overview",
      "category": "vitrine",
      "tags": ["vitrine", "showcase", "overview"],
      "entry": "vitrine/README.md"
    }
  ],
  "versioning": {
    "strategy": "semantic-versioning",
    "format": "MAJOR.MINOR.PATCH",
    "changelog": "CHANGELOG.md",
    "cacheInvalidation": "semantic version + tag aware"
  }
}
