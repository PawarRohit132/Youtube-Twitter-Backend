import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({limit : "16kb"})) // ye line ka matlab ye hai ki jab koi hmare web me aa ke koi form submite
//rha hai to wo json formate me kr rha hai kul mila ke matlab ye hai ki data ko json formate me accepte kr rhe hai

app.use(express.urlencoded({extended : true, limit : "16kb"})) // ye line me hum url se data ko accepte kr rhe hai

app.use(express.static("Public")) // ye line ka matlab ye hai ki humne ek public folder ban gya jisme hum kuch 
//chije store kr sakte hai jaise ki pdf image jo koi bhi access kr sakta hai

app.use(cookieParser());

//import routes
import userRouter from "./routes/user.routes.js"
import commentRouter from "./routes/comment.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import subscriptionRouter  from "./routes/subscription.routes.js";
import tweetRouter from "./routes/tweet.routes.js"
import videoRouter from "./routes/video.routes.js"

//routes declration
app.use("/api/v1/users", userRouter)
//yha app.use matlab jo use h wo ek middleware h os ka use esliye kr rhe q ki hum yha
//hum route kahi or file me esliye hum yha get ka use nhi kr skte 

app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlists", playlistRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/videos", videoRouter)





export {app}