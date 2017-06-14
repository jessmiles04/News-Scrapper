// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models (schemas)
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;
// Initialize Express
var app = express();
// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));
// Make public a static dir
app.use(express.static("public"));
// Database configuration with mongoose
mongoose.connect("mongodb://localhost/newsscrapper");
var db = mongoose.connection;
// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});
// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// Routes

app.get('/', function(req, res) {
	  res.send(index.html); // sending the html file rather than rendering a handlebars file
	});

app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  request("http://bookriot.com/", function(error, response, html) {
      console.log(html);
    var $ = cheerio.load(html);
    var result = [];
    $("a.trackable").each(function(i, element) {
        var title = $(this).text();
        var link = $(element).attr("href");
        result.push({
            title: title,
            link: link
        });
     // result.title = $(this).children("a").text();
      //result.link = $(this).("a").attr("href");
      var entry = new Article(result);
      // Now, save that entry to the db
    entry.save(function(err, doc) {
        // Log any errors
        if (err) {
         console.log(err);
       }
        // Or log the doc
        else {
         console.log(doc);
        }
        console.log(result);
      });
    });
  });
  // Tell the browser that we finished scraping the text
  res.send("Scrape Complete");
 });
// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      res.json(doc);
    }
  });
});

app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});
// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);
  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
   
   // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});

// Listen on port 3000
app.listen(3000, function(){
  console.log("App running on port 3000!")
});