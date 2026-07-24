const { bootstrapSearch } = require("../../packages/search/dist/bootstrap.js");

bootstrapSearch()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
