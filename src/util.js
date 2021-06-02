import uniq from 'lodash/uniq.js'
import micromatch from 'micromatch'
import path from 'path'

export const helpMessage = `
	Usage
	$ update-boilerplate <boilerplate-directory>
	Will update the project in your current working directory to the boilerplate in <boilerplate-directory>

	Options
	  -i, --include                     Globs matching the files to process, can be used multiple times.
	                                    Will extend the default matchers: **, **/.*, !**/node_modules,
	                                    !**/.git (see also --disable-default-patterns).

	  -d, --disable--default-patterns   Disable the default matchers (**, **/.*, !**/node_modules, !**/.git),
	                                    only use custom ones supplied via the --include option.

	  -j, --json                        Patterns describing which of the included files should be processed
	                                    as JSON files (meaning that the CLI will ask wether or not to copy
	                                    individual keys instead of entire files). Can be used multiple times,
	                                    defaults to '**/*.json' and '**/.*.json'

	  -y, --confirm-all                 Automatically confirm all dialogues. WARNING, THIS WILL PROBABLY
	                                    OVERWRITE FILES IN YOUR CURRENT WORKING DIRECTORY. PLEASE MAKE SURE
	                                    THAT EVERYTHING IS BACKED UP OR CHECKED INTO VERSION CONTROL BEFORE
	                                    PROCEEDING.

	  --help                            Display this help message
	  --version                         Display the version number

	Examples
	  $ update-boilerplate ../my-boilerplate-path
	  $ update-boilerplate --include "!package-lock.json" --include "!yarn.lock" ~/my-boilerplate-path
	  $ update-boilerplate --json "**/*.json" --json "**/.*.json" --json "!json-where-order-of-keys-is-important.json" ~/my-boilerplate-path
`

// remember to adapt the help message when changing these lists
export const defaultPatterns = ['**', '**/.*', '!**/node_modules', '!**/.git']
export const defaultJsonGlobs = ['**/*.json', '**/.*.json']

export const buildFileList = (boilerplateRoot, boilerplateFiles, cwdRoot, cwdFiles, jsonGlobs) => {
	const allRelativeNames = uniq([...boilerplateFiles, ...cwdFiles]).sort()
	return allRelativeNames.map(file => {
		return {
			file,
			isJson: micromatch.isMatch(file, jsonGlobs),
			boilerplatePath: path.resolve(boilerplateRoot, file),
			cwdPath: path.resolve(cwdRoot, file),
			isInBoilerplate: boilerplateFiles.includes(file),
			isInCwd: cwdFiles.includes(file),
		}
	})
}

export const splitFileList = (fileList) => {
	const normalInBoth = fileList.filter(f => f.isInBoilerplate && f.isInCwd && !f.isJson)
	const jsonInBoth = fileList.filter(f => f.isInBoilerplate && f.isInCwd && f.isJson)
	const onlyInBoilerplate = fileList.filter(f => f.isInBoilerplate && !f.isInCwd)
	const onlyInCwd = fileList.filter(f => !f.isInBoilerplate && f.isInCwd)
	return { normalInBoth, jsonInBoth, onlyInBoilerplate, onlyInCwd }
}
