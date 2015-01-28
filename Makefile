all:
	closure-compiler --js require.js --summary_detail_level 3 --compilation_level ADVANCED --js_output_file require.min.js
