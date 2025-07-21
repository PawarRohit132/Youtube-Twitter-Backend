//yha pe hum check kr rhe h ki user h ya nhi tokens ke base pr
//isme hum kya karenge jo login user honga oske pass ek object to honga hi jo req, or res hote h 
//hum ye middleware esliye bna rha ki is middleware ko hum req ke sath add kr de jaisa ki middlware ka kame hota h

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler (async(req, _, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer  ","")
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id).select("-password, -refreshToken")
        
        
        if(!user){
            //next video discuss about frontend
            throw new ApiError(401, "Invalid access token")
        }

        req.user = user
        next();
        


    } catch (error) {
        throw new ApiError(401, error?.message || "INvalid access Token")
    }
})
export {verifyJWT}
