const locale = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;
var mouseX;
var updated = {};

async function getData(path) {return await (await fetch("https://worldcupjson.net"+path)).json()}

Vue.component('flag', {
	props: {code:String, size:{type:String,default:"1"}},
	template: `	<img onerror="this.remove()" :class="'img'+size" class="flag" :src="'https://api.fifa.com/api/v3/picture/flags-sq-'+size+'/'+code" :alt="code">`
})
Vue.component('match', {
	props: ['match'],
	// template: "<span>{{match.id}}</span>",
	//future:match.status.startsWith('future')
	template: `
<div :id="match.id"
	class="group"
	tabindex=0
	:class="{current:match.id==$root.current.id,final:match.id==64}">
	<span><b>{{(match.id==64) ? "Final" : ((match.id==63) ? "Terceiro Lugar" : ((match.id==61 || match.id==62) ? "Semi-Final: Jogo " + match.id :((match.id==57 || match.id==58 || match.id==59 || match.id==60) ?"Quartas de final: Jogo " + match.id : "Oitavas: Jogo "+ match.id)))}}</b><br>{{this.$root.time(match.datetime, false, true)}}</span>
	<br><br>
<div :class="{}">
	<flag size=1 :code="matchCountry(match.home_team.country)"></flag>
	<span class="home" :class="{bold:match.home_team.name==match.winner||match.winner=='Draw'}">{{matchName(match.home_team)}}</span><span class="away biggish">{{match.home_team.goals}}</span>
	<br>
	<span class="loss">vs.</span>
	<br>
	<flag size=1 :code="matchCountry(match.away_team.country)"></flag>
	<span class="home" :class="{bold:match.away_team.name==match.winner||match.winner=='Draw'}">{{matchName(match.away_team)}}</span><span class="away biggish">{{match.away_team.goals}}</span>
</div>
<br>
</div>
`,
	methods: {
		matchName: function(team) {
			if (team.name != "To Be Determined") {
				return team.name
			}
			else if (team.country.startsWith("RU")) {
				return "Perdedor do jogo " + team.country.slice(2)
			}
			else if (team.country.startsWith("W")) {
				return app.matches[team.country.slice(1)-1].winner || "Vencedor do jogo " + team.country.slice(1)
			}
			else {
				return this.matchCountry(team.country, true)
			}
		},
		matchCountry: function(country, name=false) {
			let group = app.groups[country.charCodeAt(1)-65];
			if (!group) {
				if (country.startsWith("RU")) {
					return country
				}
				else if (country.startsWith("W")) {
					return app.matches[country.slice(1)-1].winner_code || "#" + country
				}
				else {
					return country
				}
			}
			if (group.complete) {
				let actual = group.teams[country[0]-1]
				return name ? actual.name : country
			} else {
				return name ? country.slice(1) + (country[0]=="1" ? " winner" : " runner-up") : country
			}
		}
	}
})



var app = new Vue({
	el: '#app',
	data: {
		matches: [],
		groups: [],
		current: undefined,
		details: false,
		clicking: false,
		ismoved: false,
		currentcount: 0,
		currentgamenames: [],
		showbanner: false//(localStorage.getItem("bannerclosed")<3)
	},
	mounted: function () {
		setTimeout(_=>document.documentElement.classList.add("loaded"), 1000)
	},
	methods: {
		closebanner: function() {
			this.showbanner=false;
			localStorage.setItem("bannerclosed", (localStorage.getItem("bannerclosed")|0)+1)
		},
		poll: poll,
		events: function(match) {
			var e = [];
			for (eindex in match.home_team_events) {
				let edata = match.home_team_events[eindex];
				edata.class = "left";
				if (edata.extra_info) edata.off = JSON.parse(edata.extra_info).player_off
				e.push(edata)
			}
			for (eindex in match.away_team_events) {
				let edata = match.away_team_events[eindex];
				edata.class = "right";
				if (edata.extra_info) edata.off = JSON.parse(edata.extra_info).player_off
				e.push(edata)
			}
			e.sort((a,b)=>a.id-b.id)
			return e
		},
		showdetails: function (id, click) {
			if (!this.clicking || click) {
				this.ismoved = (mouseX / window.innerWidth > 0.5)
				detailedMatch(id)
			}
			if (click && !this.clicking) {this.clicking=true}
		},
		closedetails: function () {
			if (!this.clicking) {
				this.details = false;
			}
		},
		time: function (str, l,ish) {
			let date = new Date(str);
			if (l) {
				return Intl.DateTimeFormat(locale, {dateStyle:"long", timeStyle:"short"}).format(date) + " your time";
			}

			let now = new Date();
			let diff = (date-now) / (1000 * 60 * 60 * 24);
			if (diff > 0 && diff < 1) {
				return Intl.DateTimeFormat(locale, {month:ish?'long':'narrow',day:'2-digit'}).format(date).replaceAll(" ",ish?" ":"") + " " + Intl.DateTimeFormat(locale, {hour:"numeric"}).format(date).replaceAll(" ","").toLowerCase()+":00";//(date.getDate()==now.getDate()? "  " : "+") + Intl.DateTimeFormat(locale, {hour:"numeric"}).format(date).replaceAll(" ","").toLowerCase();
			} else {
				return Intl.DateTimeFormat(locale, {month:ish?'long':'narrow',day:'2-digit'}).format(date).replaceAll(" ",ish?" ":"") + " " + Intl.DateTimeFormat(locale, {hour:"numeric"}).format(date).replaceAll(" ","").toLowerCase()+":00";
			}
		}
	}
})

window.onkeydown = (e) => {if (e.key === "Escape") {app.clicking = false;app.details = false;document.body.focus()}}
document.body.onclick = (e) => {if (e.target.closest(".gmatch, #bracket .group")==null){app.details=false}}
document.body.onmousemove = (e) => {mouseX = e.clientX}

window.onload = async () => {
	app.matches = (await getData("/matches"))

	app.matches.map(m=>{})

	let teamdata = (await getData("/teams")).groups

	for (var i=0;i<teamdata.length;i++) {
		let groupname = teamdata[i].letter.toLowerCase();
		let groupteams = teamdata[i].teams;
		let groupteamids = teamdata[i].teams.map(t=>t.country);
		let groupmatchids = [];

		let maxpoints = teamdata[i].teams.map(t=>t.group_points).sort((a,b)=>b-a)[1]

		groupmatchids = app.matches.filter(match=>{
			return groupteamids.includes(match.home_team_country) && match.stage_name == "First stage"
		}).map(m=>m.id-1).sort((a, b)=>{return a.id-b.id})


		var gamecount = 0;
		for (teamindex in groupteams) {
			let t = groupteams[teamindex]
			gamecount += t.games_played
			groupteams[teamindex].eliminated = t.group_points + ((3-t.games_played)*3) < maxpoints
			// console.log(groupteams[teamindex].eliminated)
		}

		app.groups.push({
			letter:groupname,
			teams:groupteams.sort((a,b)=>b.group_points-a.group_points||b.goal_differential-a.goal_differential),
			matches:groupmatchids,
			complete:gamecount==12
		})
	}

	app.current = app.matches.filter(m=>m.status=="in_progress")[0]
	if (app.current === undefined) {
		//console.log(app.current)
		let temp = app.matches.filter(m=>m.status=="completed").sort((a,b)=>{return Date(a.datetime) - Date(b.datetime)})
		app.current = temp[temp.length-1]
	}
	poll();
	setInterval(poll, 57*1000)// every 57 seconds
}

async function poll() {
	let currentgames = (await getData("/matches/current"))
	app.currentgamenames = currentgames.map(g=>g.home_team.name + " v. " + g.away_team.name);
	let newdata = currentgames[app.currentcount|0]
	if (newdata !== undefined) {
		app.current = newdata;
		app.matches[current.id-1] = newdata;
	}
}
async function detailedMatch(id) {
	if (!(id in updated)) {
		updated[id] = (await getData("/matches/"+id))
	}
	app.details = updated[id]
}
