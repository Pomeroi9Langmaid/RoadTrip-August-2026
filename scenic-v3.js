window.SCENIC_HIGHLIGHTS = [
  {id:'kungalv',title:'Kungälv',subtitle:'Home · start & finish',lat:57.89,lng:11.97,type:'home',featured:true,stopId:'home-start',day:1,status:'visited'},
  {id:'haverud-highlight',title:'Håverud Aqueduct',subtitle:'Dalsland Canal · first scenic stop',lat:58.821544,lng:12.410075,type:'aqueduct',featured:true,stopId:'haverud',day:1,status:'visited'},
  {id:'glaskogen',title:'Glaskogen Nature Reserve',subtitle:'Forest-and-lake scenic drive',lat:59.48911,lng:12.41089,type:'forest',featured:true,day:2,status:'visited',website:'https://www.glaskogen.se/en/'},
  {id:'glava-highlight',title:'Glava Glasbruk',subtitle:'Historic glassworks',lat:59.530866,lng:12.477089,type:'heritage',featured:true,stopId:'glava',day:2,status:'visited',website:'https://glavaglasbruk.org/'},
  {id:'arvika',title:'Arvika',subtitle:'Western Värmland',lat:59.6553,lng:12.5852,type:'town',featured:false,day:3,status:'visited'},
  {id:'fryksdalen',title:'Fryksdalen',subtitle:'Fryk Valley views',lat:59.85,lng:13.08,type:'valley',featured:true,day:3,status:'visited'},
  {id:'tossebergsklatten',title:'Tossebergsklätten',subtitle:'Viewpoint above Fryksdalen',lat:59.9843,lng:13.1025,type:'viewpoint',featured:true,day:3,status:'visited'},
  {id:'ritamaki-highlight',title:'Ritamäki finngård',subtitle:'Favourite afternoon · Finnish forest settlement',lat:60.149036,lng:12.541905,type:'favourite',featured:true,stopId:'ritamaki',day:3,status:'visited'},
  {id:'hovfjallet',title:'Hovfjället',subtitle:'Mountain scenery',lat:60.29491,lng:12.96528,type:'mountain',featured:true,day:4,status:'visited',website:'https://sommar.hovfjallet.se/'},
  {id:'klaralvdalen',title:'Klarälvdalen',subtitle:'Scenic river-valley drive',lat:60.12,lng:13.45,type:'river',featured:true,day:4,status:'visited'},
  {id:'stockholm-highlight',title:'Stockholm',subtitle:'Södermalm',lat:59.30852,lng:18.08013,type:'city',featured:true,stopId:'stockholm',day:5,status:'visited'},
  {id:'vadstena-highlight',title:'Vadstena',subtitle:'Historic town beside Vättern',lat:58.44592,lng:14.89912,type:'heritage',featured:true,stopId:'vadstena',day:6,status:'visited'},
  {id:'granna',title:'Gränna',subtitle:'Lake Vättern views',lat:58.01667,lng:14.46667,type:'town',featured:true,day:7,status:'visited'}
];

window.ACCOMMODATION_LINKS = {
  'duse-udde':'https://firstcamp.se/destinationer/duse-udde-saffle',
  'glava':'https://glavaglasbruk.org/',
  'torsby':'https://valbergsangen.se/',
  'hallagarden':'https://hallagarden.com/b-b/',
  'stockholm':'https://skanstulls.se/',
  'vadstena':'https://vadstenavandrarhem.se/'
};

window.STAY_ORDER = ['duse-udde','glava','torsby','hallagarden','stockholm','vadstena'];

window.ROUTE_ANCHORS = [
  {stopId:'home-start',day:1,label:'Home'},
  {stopId:'haverud',day:1,label:'Håverud'},
  {stopId:'duse-udde',day:1,label:'Duse Udde'},
  {highlightId:'glaskogen',day:2,label:'Glaskogen'},
  {stopId:'glava',day:2,label:'Glava Glasbruk'},
  {highlightId:'arvika',day:3,label:'Arvika'},
  {highlightId:'fryksdalen',day:3,label:'Fryksdalen'},
  {highlightId:'tossebergsklatten',day:3,label:'Tossebergsklätten'},
  {stopId:'ritamaki',day:3,label:'Ritamäki'},
  {stopId:'torsby',day:3,label:'Torsby'},
  {highlightId:'hovfjallet',day:4,label:'Hovfjället'},
  {highlightId:'klaralvdalen',day:4,label:'Klarälvdalen'},
  {stopId:'hallagarden',day:4,label:'Vintrosa'},
  {stopId:'stockholm',day:5,label:'Stockholm'},
  {stopId:'vadstena',day:6,label:'Vadstena'},
  {highlightId:'granna',day:7,label:'Gränna'},
  {stopId:'home-end',day:7,label:'Home'}
];
