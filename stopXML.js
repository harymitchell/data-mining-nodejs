/**
 * Reads the terrier-stop.txt word list and outputs a Pentaho XML structure for word replacement.
 */ 

var template = `
<field>
    <in_stream_name>reviewLower</in_stream_name>
    <out_stream_name/>
    <use_regex>no</use_regex>
    <replace_string>{{STRING}}</replace_string>
    <replace_by_string/>
    <set_empty_string>N</set_empty_string>
    <replace_field_by_string/>
    <whole_word>yes</whole_word>
    <case_sensitive>no</case_sensitive>
</field>
`

var Baby = require ("babyparse")

var parseConfig = {
	delimiter: ",",	// auto-detect
	newline: "",	// auto-detect
	quoteChar: '"',
	header: false,

}
var parsed = Baby.parseFiles("terrier-stop.txt", parseConfig);

parsed.data.forEach(function(d){
    console.log (template.replace ("{{STRING}}", d[0]))
});