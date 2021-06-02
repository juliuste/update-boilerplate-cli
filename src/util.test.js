import test from 'ava'
import { buildFileList, defaultJsonGlobs, splitFileList } from './util.js'

test('buildFileList', async t => {
	const filesA = ['src/1.json', 'test/2.ndjson', '.gitignore', '.eslintrc.json']
	const filesB = ['src/1.json', 'test/.hidden.json', '.gitignore']
	t.deepEqual(buildFileList('/home/a', filesA, '/home/b', filesB, defaultJsonGlobs), [
		{ file: '.eslintrc.json', isJson: true, boilerplatePath: '/home/a/.eslintrc.json', cwdPath: '/home/b/.eslintrc.json', isInBoilerplate: true, isInCwd: false },
		{ file: '.gitignore', isJson: false, boilerplatePath: '/home/a/.gitignore', cwdPath: '/home/b/.gitignore', isInBoilerplate: true, isInCwd: true },
		{ file: 'src/1.json', isJson: true, boilerplatePath: '/home/a/src/1.json', cwdPath: '/home/b/src/1.json', isInBoilerplate: true, isInCwd: true },
		{ file: 'test/.hidden.json', isJson: true, boilerplatePath: '/home/a/test/.hidden.json', cwdPath: '/home/b/test/.hidden.json', isInBoilerplate: false, isInCwd: true },
		{ file: 'test/2.ndjson', isJson: false, boilerplatePath: '/home/a/test/2.ndjson', cwdPath: '/home/b/test/2.ndjson', isInBoilerplate: true, isInCwd: false },
	])
})

test('splitFileList', async t => {
	t.deepEqual(splitFileList([
		{ file: '.eslintrc.json', isJson: true, boilerplatePath: '/home/a/.eslintrc.json', cwdPath: '/home/b/.eslintrc.json', isInBoilerplate: true, isInCwd: false },
		{ file: '.gitignore', isJson: false, boilerplatePath: '/home/a/.gitignore', cwdPath: '/home/b/.gitignore', isInBoilerplate: true, isInCwd: true },
		{ file: 'src/1.json', isJson: true, boilerplatePath: '/home/a/src/1.json', cwdPath: '/home/b/src/1.json', isInBoilerplate: true, isInCwd: true },
		{ file: 'test/.hidden.json', isJson: true, boilerplatePath: '/home/a/test/.hidden.json', cwdPath: '/home/b/test/.hidden.json', isInBoilerplate: false, isInCwd: true },
		{ file: 'test/2.ndjson', isJson: false, boilerplatePath: '/home/a/test/2.ndjson', cwdPath: '/home/b/test/2.ndjson', isInBoilerplate: true, isInCwd: false },
	]), {
		normalInBoth: [
			{ file: '.gitignore', isJson: false, boilerplatePath: '/home/a/.gitignore', cwdPath: '/home/b/.gitignore', isInBoilerplate: true, isInCwd: true },
		],
		jsonInBoth: [
			{ file: 'src/1.json', isJson: true, boilerplatePath: '/home/a/src/1.json', cwdPath: '/home/b/src/1.json', isInBoilerplate: true, isInCwd: true },
		],
		onlyInBoilerplate: [
			{ file: '.eslintrc.json', isJson: true, boilerplatePath: '/home/a/.eslintrc.json', cwdPath: '/home/b/.eslintrc.json', isInBoilerplate: true, isInCwd: false },
			{ file: 'test/2.ndjson', isJson: false, boilerplatePath: '/home/a/test/2.ndjson', cwdPath: '/home/b/test/2.ndjson', isInBoilerplate: true, isInCwd: false },
		],
		onlyInCwd: [
			{ file: 'test/.hidden.json', isJson: true, boilerplatePath: '/home/a/test/.hidden.json', cwdPath: '/home/b/test/.hidden.json', isInBoilerplate: false, isInCwd: true },
		],
	})
})
