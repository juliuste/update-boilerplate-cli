import ConfirmPrompt from 'enquirer/lib/prompts/confirm.js'

export class YesNoPrompt extends ConfirmPrompt {
	// eslint-disable-next-line space-before-function-paren
	format(value) {
		const { styles, state } = this
		const formatted = value ? 'yes' : 'no'
		return !state.submitted ? styles.primary(formatted) : styles.success(formatted)
	}
}

// adapted ConfirmPrompt which also shows a temporary text above the question,
// but only as long as the prompt has not been submitted. (render method copied
// from enquirer's boolean prompt)
export class YesNoPromptWithTemporaryText extends YesNoPrompt {
	// eslint-disable-next-line space-before-function-paren
	constructor(options) {
		super(options)
		this.temporaryText = this.options.temporaryText
	}

	// eslint-disable-next-line space-before-function-paren
	async render() {
		const { input, size, submitted } = this.state

		const prefix = await this.prefix()
		const sep = await this.separator()
		const msg = await this.message()
		const hint = this.styles.muted(this.default)

		let promptLine = [prefix, msg, hint, sep].filter(Boolean).join(' ')
		this.state.prompt = promptLine

		const header = await this.header()
		const value = this.value = this.cast(input)
		let output = await this.format(value)
		const help = (await this.error()) || (await this.hint())
		const footer = await this.footer()

		if (help && !promptLine.includes(help)) output += ' ' + help
		promptLine += ' ' + output

		this.clear(size)
		this.write([header, promptLine, footer, ...((submitted || !this.temporaryText) ? [] : [this.temporaryText])].filter(Boolean).join('\n'))
		this.restore()
	}
}
