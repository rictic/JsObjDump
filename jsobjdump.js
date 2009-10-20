
var JsObjDump = (function() {

  var seen;
  var line_count;
  var DEFAULT_SKIP = [];

  var MAX_LINE_COUNT, MAX_DEPTH, FUNCTION_SOURCE, SKIP;

  function set_prefs() {
    var o = console.options ? console.options : {};
    MAX_LINE_COUNT  = o.MAX_LINE_COUNT  || 3000;         // bail if we generate more lines than this
    MAX_DEPTH       = o.MAX_DEPTH       || 8;            // bail if we go deeper than x levels
    FUNCTION_SOURCE = o.FUNCTION_SOURCE || false;        // show full source code of functions
    SKIP            = o.SKIP            || DEFAULT_SKIP; // list of objects to ignore (defaults set by acreboot.js)
  }

  var toString = Object.prototype.toString;
  function isArray( obj ) {
    return toString.call(obj) === "[object Array]";
  }

  function get_function_sig(value) {
    var code = value.toString();
    if (FUNCTION_SOURCE) {
      return code;
    } else {
      var r = /function\s+(.+?)\s*\{/.exec(code); /*} - needed for textmate format bug */
      if (!r || !r.length) { return "ERROR: invalid function "+code; }
      return r[1];
    }
  }

  function annotate(obj,depth) {
    var typ, // object's type
    newobj;  // a copy of obj

    line_count++;
    if (line_count>MAX_LINE_COUNT) { return '~~TOO_MANY_LINES~~'; }

    typ = typeof obj;
    if (typ==='object') {
      // JS spec bugs
      if (!obj) { typ = 'null'; }
      //HACK: TODO if (d instanceof Date)
      else if (isArray(obj)) { typ = 'array'; } // WILL: this will stop full dump on a = new Array(11,22,33); a.will=true;
    }
    if (typ!=='object' && typ!=='function' && typ!=='array') { // is it a boolean, number, string, undefined, null
      if (typ==='undefined') { return '~~UNDEFINED~~'; }
      else {                  return obj; }
    }

    // should we ignore this object?
    if (depth>1 && SKIP.indexOf(obj)!==-1 ) {
      return '~~SKIPPED~~';
    }

    // have we already seen this object?
    var id = seen.indexOf(obj);
    if (id !== -1) {
      // yes, then link to it
      return '~~LINK:'+id+'~~';
    } else {
      // no, give it a new id
      id = seen.length;
      seen[id]=obj;
    }

    if (depth>MAX_DEPTH) { return '~~TOO_DEEP~~'; }

    if (typ==='array') {
      newobj = [];
      //DOC:
      for (var i=obj.length;i>0;i--) {
        newobj[i] = annotate(obj[i-1], depth+1);
      }
      newobj[0]='~~ID:'+id+'~~';
    } else {
      //object or function
      newobj={ '~~ID~~': id };
      if (typ==='function') { newobj['~~FUNC~~'] = get_function_sig(obj); }
      //WILL: what would be useuful to display? if (obj.constructor) { newobj['~~CONS~~']=obj.constructor+''; }
      //      if (obj.__proto__ && obj.__proto__!==Object.prototype) { newobj['~~PROTO~~'] = annotate(obj.__proto__); }
      for (var key in obj) {
        if (key==='prototype') { continue; } //WILL: just strip boring prototypes??
        var inherited = Object.hasOwnProperty.call(obj, key) ? '' : '~~INHERTIED~~';
        newobj[inherited+key] = annotate(obj[key], depth+1);
      }
    }
    return newobj;
  }

  function annotate_list () { /*arguments*/
    set_prefs();

    var annotated = []; // copy of arguments, annotated with links to cycles, functions, undefined
    seen = [];          // list of objects anywhere in the hierarchy of all the args

    for (var i=0;i<arguments.length;i++) {
      line_count = 0;  // number of properties to show per object
      annotated[i] = annotate( arguments[i] , 1 );
    }
    return annotated;
  }
  return {annotate_list:annotate_list, DEFAULT_SKIP:DEFAULT_SKIP}; // JsObjDump
}
)
();