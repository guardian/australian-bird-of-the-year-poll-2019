import template from '../../templates/template.html'
import modalTemplate from '../../templates/modal.html'
import nominateTemplate from '../../templates/nominate.html'
import { $, $$, round, numberWithCommas, wait, getDimensions } from '../modules/util'
import Ractive from 'ractive'
import ractiveFade from 'ractive-transitions-fade'
import ractiveTap from 'ractive-events-tap'
import Fingerprint2 from 'fingerprintjs2sync';
import smoothscroll from 'smoothscroll-polyfill';
import { Toolbelt } from '../modules/toolbelt'
import Modal from '../modules/modal'
import moment from 'moment'
import share from '../modules/share'
Ractive.DEBUG = false;
smoothscroll.polyfill();

export class Birds {

	constructor(application) {

		var self = this

        this.toolbelt = new Toolbelt()

        this.googledoc = application.database

        this.settings = application.settings 

        this.displayCountdown = false

        this.countdown = null

        if (this.settings.testing) {

            self.uid = this.settings.randomID

            if (this.settings.localstore) {

                localStorage.removeItem(self.settings.cookie)

            }

        } else {

            self.uid = (new Fingerprint2({ extendedJsFonts: true, excludeUserAgent: true })).getSync().fprint ;

            if (this.settings.localstore) {

                if (localStorage.getItem(self.settings.cookie)) {

                    let json = JSON.parse( localStorage.getItem(self.settings.cookie) )

                    self.uid = json.uid

                    self.settings.preflight = false

                }

            }

        }

        var ts = Math.round((new Date()).getTime()) / 1000

        if (ts > self.settings.competition_closing_time) {

            // self.settings.preflight = false

        }

        if (self.settings.preflight) {

            this.googledoc.shuffle()

        } else {

            this.rank()

        }

        this.ractivate()

	}

    displayTime(time) {

        var self = this

        var millisecondsinSecond = 1000,
        millisecondsinMinute = 60 * millisecondsinSecond,
        millisecondsinHour = 60 * millisecondsinMinute,
        millisecondsInDay = 24 * millisecondsinHour,
        millisecondsinYear = 365 * millisecondsInDay;

        var timeUntil = this.settings.competition_closing_time - time;

        var obj = {}
        obj.years = Math.floor(timeUntil / millisecondsinYear),
        obj.days = Math.floor((timeUntil % millisecondsinYear)/millisecondsInDay),
        obj.hours = Math.floor((timeUntil % millisecondsInDay)/millisecondsinHour),
        obj.mins = Math.floor((timeUntil % millisecondsinHour)/millisecondsinMinute),
        obj.secs = parseInt( Math.floor((timeUntil % 60000)) / 1000 );
        self.countdown = obj

        self.ractive.set('displayCountdown', self.displayCountdown)
        self.ractive.set('countdown', self.countdown)

    }

	ractivate() {

		var self = this

		this.ractive = new Ractive({

			target: "#app",

			template: template,

			data: { 

				bird : self.googledoc,

                eligible: self.settings.preflight,

                filepath: self.settings.filepath,

                isMobile: self.settings.isMobile,

                isApp: self.settings.isApp,

                isIos: self.settings.isIos,

                isIosApp: self.settings.isIosApp,

                displayCountdown: self.displayCountdown,

                votecount : self.settings.votecount,

                updated: moment().format("hh:mm A"),

                countdown: self.countdown,

                final: self.settings.final,

				singularity: function(num) {

					return (num === 1) ? 'vote' : 'votes' ;

				},

                oddeven: function(num) {

                    return (num % 2 == 0) ? 'left' : 'right' ;

                },

                evenodd: function(num) {

                    return (num % 2 == 0) ? 'right' : 'left' ;

                }

			}

		});

        this.ractive.on( 'vote', function ( context, id ) {

            var data = [{ "iid" : id, "settings" : self.settings }]

            self.showModal(id, data)

        });

        this.ractive.on( 'nominate', function ( context ) {

            self.showNomination()

        });

        this.ractive.on( 'social', ( context, channel ) => {


            var shareURL = "https://www.theguardian.com/environment/ng-interactive/2019/oct/27/australian-bird-of-the-year-2019-vote-for-your-favourite"

            let shared = share(self.settings.social_title, shareURL, self.settings.social_fbImg, "", self.settings.social_hashed, self.settings.social_message);
        
            shared(channel);

        });

        this.interval = setInterval(function(){ 

            var ts = Math.floor( Math.round((new Date()).getTime()) / 1000 ) ;

            if (ts > self.settings.competition_closing_time) {

                clearTimeout(self.interval);

                self.displayCountdown = false

                self.ractive.set('displayCountdown', self.displayCountdown)

                if (!self.settings.final) {

                    location.reload(true);

                }

                // self.settings.preflight = false

                // self.ractive.set('eligible', self.settings.preflight)

                // console.log("The competition is now closed")

            } else {

                self.displayCountdown = true

                if (self.settings.testing) {

                    console.log("Beep " + (self.settings.competition_closing_time - ts))

                }

                var ts = Math.round((new Date()).getTime());

                self.displayTime(ts)

            }


        }, 1000);

	}

    showModal(iid, data) {

        var self = this

        var modal = new Modal({
            transitions: { fade: ractiveFade },
            events: { tap: ractiveTap },
            data: {
                message: "You only get one vote, are you sure?"
            },
            template: modalTemplate
        });


        modal.on('voting', function(e) {

            e.original.preventDefault()

            if (self.settings.localstore) {

                if (!localStorage.getItem(self.settings.cookie)) {

                    localStorage.setItem(self.settings.cookie, JSON.stringify({ "uid" : self.uid, "cid" : self.settings.cid, "key" : self.settings.key, "data" : data }))

                    self.settings.preflight = false

                    self.postdata(iid, data)

                }

            } else {

                if (self.settings.preflight) {

                    self.settings.preflight = false

                    self.postdata(iid, data)

                }

            }

            this.teardown();

        })

        modal.on('close', function(e) {

            e.original.preventDefault()

        })

    }

    postdata(iid, payload) {

        var self = this

        var data = JSON.stringify({ "uid" : self.uid, "cid" : self.settings.cid, "key" : self.settings.key, "data" : payload })

        var xhr = new XMLHttpRequest();
        var url = "https://pollarama.herokuapp.com/api/";
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.onreadystatechange = function () { 
            console.log(`${xhr.readyState} - ${xhr.status}`)
        }

        xhr.send(data);

        self.update(iid)

    }

    update(id) {

        var self = this

        self.settings.total = self.settings.total + 1

        self.settings.max = Math.max.apply(Math, self.googledoc.map(function(o) { return o.votes; }))

        self.googledoc.forEach((value) => {

            if (value.id===id) {

                value.votes = value.votes + 1

            }

        });

        self.rank()

        self.ractive.set('bird', self.googledoc)

        self.ractive.set('votecount', self.settings.votecount)

        self.ractive.set('updated', moment().format("hh:mm A"))

        self.ractive.set('eligible', self.settings.preflight)

        var element = document.getElementById("timestamp");

        this.scrollTo(element)

    }

    rank() {

        var self = this

        self.googledoc.sort( (a, b) => b.votes - a.votes);

        self.googledoc.forEach((value, index) => {

            value["rank"] = index + 1

            value['barWidth'] = (value['votes'] / self.settings.max ) * 100;

        });

        self.settings.votecount = self.toolbelt.addCommasToNumbers(self.settings.total)

    }

    showNomination() {

        var self = this

        var modal = new Modal({
            transitions: { fade: ractiveFade },
            events: { tap: ractiveTap },
            template: nominateTemplate,
            data: {
                isApp: self.settings.isApp
            }
        });

        modal.on('close', function(e) {

            e.original.preventDefault()

        })

        modal.on('nominate', function(e) {

            var bird = $("#nomination-bird").value;

            if (bird != "") {

                var obj = {}

                obj.bird = bird

                var data = [{ "iid" : self.settings.optionID, "input" : obj, "settings" : self.settings  }]

                this.teardown();

                self.showModal(self.optionID, data)

            }

        })

    }

    scrollTo(element) {

        var self = this

        setTimeout(function() {

            var elementTop = window.pageYOffset + element.getBoundingClientRect().top

            window.scroll({

              top: elementTop,

              behavior: "smooth"

            });

        }, 400);

    }
}