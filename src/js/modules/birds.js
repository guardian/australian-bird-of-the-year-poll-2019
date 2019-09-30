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

        if (this.settings.testing) {

            self.uid = this.settings.randomID

            if (this.settings.localstore) {

                localStorage.removeItem('ga_poll_birdpoll_2019' + self.settings.cid)

            }

        } else {

            self.uid = (new Fingerprint2({ extendedJsFonts: true, excludeUserAgent: true })).getSync().fprint ;

            if (this.settings.localstore) {

                if (localStorage.getItem('ga_poll_birdpoll_2019' + self.settings.cid)) {

                    let json = JSON.parse( localStorage.getItem('ga_poll_birdpoll_2019' + self.settings.cid) )

                    self.uid = json.uid

                    self.settings.preflight = false
      
                }

            }

        }

        var ts = Math.round((new Date()).getTime()) / 1000

        if (ts > self.settings.closing) {

            self.settings.preflight = false

        }

        if (self.settings.preflight) {

            this.googledoc.shuffle()

        } else {

            this.rank()

        }

        this.ractivate()

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

                votecount : self.settings.votecount,

                updated: moment().format("hh:mm A"),

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

            var data = [{ "iid" : id }]

            self.showModal(id, data)

        });

        this.ractive.on( 'nominate', function ( context ) {

            self.showNomination()

        });

        this.ractive.on( 'social', ( context, channel ) => {

            var shareURL = self.toolbelt.getShareUrl()

            let shared = share(self.settings.social_title, shareURL, self.settings.social_fbImg, self.settings.social_twImg, self.settings.social_hashed, self.settings.social_message);
        
            shared(channel);

        });

        /*
        this.interval = setInterval(function(){ 

            var ts = Math.round((new Date()).getTime()) / 1000;

            if (ts > self.settings.closing) {

                clearTimeout(self.interval);

                self.settings.preflight = false

                self.ractive.set('eligible', self.settings.preflight)

                console.log("The competition is now closed")

            } else {

                if (self.settings.testing) {

                    console.log("Beep " + (self.settings.closing - ts))

                }

            }

        }, 1000);
        */

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

                if (!localStorage.getItem('ga_poll_birdpoll_2019' + self.settings.cid)) {

                    localStorage.setItem('ga_poll_birdpoll_2019' + self.settings.cid, JSON.stringify({ "uid" : self.uid, "cid" : self.settings.cid, "key" : self.settings.key, "data" : data }))

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
            if (xhr.readyState == 4 && xhr.status == 200) {

                var json = JSON.parse(xhr.responseText);

                if (json.status < 70 && self.voting) {

                    self.settings.preflight = false

                }

                console.log(json.status)
               
            }
        }

        xhr.send(data);

        self.update(iid)

    }

    update(id) {

        var self = this

        self.settings.total = self.settings.total + 1

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

            value['barWidth'] = (value['votes'] / self.settings.total ) * 100;

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

                var data = [{ "iid" : self.settings.optionID, "input" : obj }]

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