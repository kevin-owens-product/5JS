# Motif documentation

Motif is an experimental TypeScript visualization project with three distinct surfaces: the `fivejs` rendering library, the private `motif-connectors` package, and application examples. Both packages are unpublished; the website is live. Start with the path that matches your task.

| Your task | Read first | Next |
| --- | --- | --- |
| Try a visualization | [Getting started](GETTING_STARTED.md) | [Live gallery](https://kevin-owens-product.github.io/5JS/examples/) |
| Embed a scene | [API reference](API.md) | [Compatibility and cleanup](COMPATIBILITY.md) |
| Connect a source | [Connector reference](../packages/connectors/README.md) | [45 source guides](https://kevin-owens-product.github.io/5JS/connectors/) |
| Adapt a decision workflow | [Architecture](ARCHITECTURE.md) | [Source adaptation](../examples/README.md#adapt-the-motif-decision-lab) |
| Add an example | [Recipe authoring](../examples/README.md#add-a-recipe) | [Contributing](../CONTRIBUTING.md) |
| Work with a coding agent | [Repository instructions](../AGENTS.md) | [Machine-readable index](../llms.txt) |
| Compare alternatives | [Ecosystem review](ECOSYSTEM_REVIEW.md) | [Documentation audit](DOCUMENTATION_AUDIT.md) |
| Diagnose a failure | [Troubleshooting](TROUBLESHOOTING.md) | [Compatibility](COMPATIBILITY.md) |
| Ship a change | [Release checklist](RELEASING.md) | [Security reporting](../SECURITY.md) |

## Documentation contracts

The API reference describes exported behavior. Example guides describe application code you can adapt; they do not promise additional package exports. Connector guides state specific read operations and verification limits. The ecosystem review is a dated assessment, not an exhaustive inventory or performance benchmark.

For an older checkout, use its own documentation and manifests. Website guides and GitHub `main` may describe a later revision. Read [the changelog](../CHANGELOG.md) before adapting old code. `llms.txt` is a discovery aid, not an agent runtime or a guarantee that an assistant will retrieve it.
