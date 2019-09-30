import settings from './data/settings'
import { Preflight } from './modules/preflight'
import { Birds } from './modules/birds'
import loadJson from '../components/load-json/'
import { $, $$, round, numberWithCommas, wait, getDimensions } from './modules/util'

var app = {

	init: (key) => {

		(app.isIos()) ? app.ignoreParallaxUniverse() : app.enterParallaxUniverse() ;

		loadJson(`https://interactive.guim.co.uk/firehose/${key}.json?t=${new Date().getTime()}`)
			.then((data) => {

				var wrangle = new Preflight(data, key, settings)

				wrangle.process().then( (application) => {

					new Birds(application)

				})

				
			})


	},

	isIos: function() {

	  var iDevices = [
	    'iPad Simulator',
	    'iPhone Simulator',
	    'iPod Simulator',
	    'iPad',
	    'iPhone',
	    'iPod'
	  ];

	  if (!!navigator.platform) {
	    while (iDevices.length) {
	      if (navigator.platform === iDevices.pop()){ return true; }
	    }
	  }

	  return false;

	},

	enterParallaxUniverse: function() {

		var opThresh = 350;
		var opFactor = 750;

		window.addEventListener("scroll", function(event) {

			var top = this.pageYOffset;

			var layers = document.getElementsByClassName("parallax");
			var descend = document.getElementsByClassName("descend");
			
			var layer, speed, yPos;
			for (var i = 0; i < layers.length; i++) {
				layer = layers[i];
				speed = layer.getAttribute('data-speed');
				var yPos = -(top * speed / 100);
				layer.setAttribute('style', 'transform: translate3d(0px, ' + yPos + 'px, 0px)');

			}

		});

	},

	ignoreParallaxUniverse: function() {
		$("#nonparallax").style.display = "block"
		$("#parallax").style.display = "none"
	}

}

app.init("1R3zG-DJRqN7MFLGqjhZs26D1SJcKI7pkd1j1XDwAiIM")