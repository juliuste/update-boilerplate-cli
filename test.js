import test from 'ava'
import execa from 'execa'

test('main', async t => {
	const { stdout } = await execa('./src/cli.js', ['ponies'])
	t.is(stdout, 'ponies')
})
