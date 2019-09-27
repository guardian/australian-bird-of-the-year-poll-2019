import settings from './data/settings'
import { Preflight } from './modules/preflight'
import { Birds } from './modules/birds'
import loadJson from '../components/load-json/'

var app = {

	init: (key) => {

		loadJson(`https://interactive.guim.co.uk/firehose/${key}.json?t=${new Date().getTime()}`)
			.then((data) => {

				var wrangle = new Preflight(data, key, settings)

				wrangle.process().then( (application) => {

					new Birds(application)

				})

				
			})


	}

}

app.init("1R3zG-DJRqN7MFLGqjhZs26D1SJcKI7pkd1j1XDwAiIM")