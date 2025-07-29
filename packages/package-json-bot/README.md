# PackageJSON Bot

PackageJSON Bot is a tool that helps you manage your package.json file by providing a set of features to make it easier to maintain and update your dependencies.

## Features

Bot looks for all package.json dependencies, devDependencies, peerDependencies, optionalDependencies, and bundleDependencies.

after that it requests the server and downloads package.llm.txt from the server if it exists.

If not exists, the server AI bot goes to search internet to npmjs, github repository, github issues, github pull requests, readme, changelog, package official page with docs, unofficial docs, and other sources to find the current version docs, upgrade from previous version, upgrade to the next version, and writes package.llm.txt files to the cloudflare R2, and sends required data back to the client with next request. It keeps track of requested packages and keeps them in llm_modules directory, which can be committed into github repository. It keeps versioning the same as in node_modules with @1.0.0 semver postfix.

it is in itself a monorepo with cli tool as client, vscode extension as client, server side is cloudflare workers, cloudflare Durable objects, Cloudflare KV store for caching llm.tsx files, R2 for long term storage.
Also will need a web frontend app which will be a cloudflare worker with reactrouter v7 in framework, and will show the list of existing llm.txt files for packages, and download statistics to each of them.

domain name will be <https://packagejsonbot.com>

backend will be <https://api.packagejsonbot.com>
