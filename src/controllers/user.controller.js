import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
  //tokens ko create krne ke liye userId to lgti hi jo humne parmeter me li ab userId User ke andar se milengi
  try {
    const user = await User.findById(userId);
    const accessToken = user.generatAccessToken();
    const refreshToken = user.generatRefreshToken();
    //ab tokens h wo generate to ho gaye h lekin method ke andar hi h server pe save nhi huye h to save krte h

    user.refreshtoken = refreshToken; //is line jo usermodel bna hua oske object jo refreshtoken h osme refreshtoken save ho gya h
    await user.save({ validateBeforeSave: false });
    // console.log(user);

    return { accessToken, refreshToken };
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while generating access and refresh toke" ||
        error.message,
    });
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //step 1 getuser details from frontend

  try {
    const { fullname, email, username, password } = req.body; //yha pe hum sirf jo json se data aa rha h osse
    //handle kr rhe jaise fullname email etc lekin jo file aa rhi hai osse handle nhi kr rhe jaise avatar,image
    // console.log("email", email);

    //step 2 validation

    if (
      [fullname, username, email, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "All field are required",
      });
    }

    //step 3 check user already exits

    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existedUser) {
      return res.status(400).json({
        success: false,
        message: "User with email or username already exists",
      });
    }

    //step 4 check avatar and image

    const avatarLocakPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.path;

    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }

    //step 5 check avatar file is required

    if (!avatarLocakPath) {
      res.status(400).json({
        success: false,
        message: "avatar file is required",
      });
    }

    //step 6 upload on cloudinary

    const avatar = await uploadOnCloudinary(avatarLocakPath);
    let coverImage;

    if (coverImageLocalPath) {
      coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    //yha pe hum ek bar or check kr rhe h ki avatar upload hua h ya nhi q ki ye required h

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: "avatar file is required",
      });
    }

    //step 7 creat user object- creat entry in db

    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    //yha hum check kr rhe h ki user object creat hua h ya nhi oski id se check kr rhe h
    //or step 8 remove pass, remove refresh token field from response ko follow kr rhe h

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // ab jo id se user mila h wo createUser me store ho gya honga to check kr lenge ki user creat hua h ya nhi

    if (!createdUser) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong while register the form",
      });
    }

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: false, // localhost ke liye false
      sameSite: "lax",
    };

    // step 9 retur respose to user

    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, createdUser, "User registered successfuly"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while user register" || error?.message,
    });
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, password } = req.body;

    //step 2

    if (!(email || username)) {
      return res.status(400).json({
        success: false,
        message: "username or email is required",
      });
    }

    //step 3 find the user

    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    //step 4 password check

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        message: "password incorrect",
      });
    }

    //step 5 access and refresh token

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!loggedInUser) {
      res.status(400).json({
        success: false,
        message: "User not exist",
      });
    }

    //step 6 cookie

    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    };

    //step 7 return res

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          201,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged in Successfully"
        )
      );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while login user" || error?.message,
    });
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    };
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User Log Out"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while logout user" || error?.message,
    });
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    // console.log(incomingRefreshToken);

    if (!incomingRefreshToken) {
      return res.status(400).json({
        success: false,
        message: "unauthorised request",
      });
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: "unauthorised request",
      });
    }

    const user = await User.findById(decodedToken?._id);

    // console.log(user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is expired or used",
      });
    }

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "refreshToken refreshed"
      );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while refresh Access token",
    });
  }
});

const changePasswordCurrent = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(201, {}, "Password change successfully"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while change password" || error?.message,
    });
  }
});

const getCurrectUser = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(
        new ApiResponse(200, req.user, "current user fetched successfully")
      );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "something went wrong while fetched current user" || error?.message,
    });
  }
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  try {
    const { fullname, email } = req.body;

    if (!(fullname || email)) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          fullname: fullname,
          email: email,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details changed successfully"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while update details" || error?.message,
    });
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarLocalPath = req.file.path;
    if (!avatarLocalPath) {
      return res.status(400).json({
        success: false,
        message: "avatar file is missing",
      });
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
      return res.status(500).json({
        success: false,
        message: "Error while uploading avatar on cloudinary",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "avatar updated successfully"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "something went wrong while update user avatar" || error?.message,
    });
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  try {
    const coverImageLocalPath = req.file.path;

    if (!coverImageLocalPath) {
      return res.status(400).json({
        success: false,
        message: "cover file is missing",
      });
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
      return res.status(500).json({
        success: false,
        message: "Error while uploading coverImage",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: coverImage.url,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "cover Image updated successfully"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "something went wrong while update cover image" || error?.message,
    });
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  try {
    const { username } = req.params;

    if (!username?.trim()) {
      return res.status(400).json({
        success: false,
        message: "username is required",
      });
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },

      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          channelSubcribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullname: 1,
          username: 1,
          subscribersCount: 1,
          channelSubcribedToCount: 1,
          isSubscribed: 1,
          email: 1,
          avatar: 1,
          coverImage: 1,
        },
      },
    ]);

    if (!channel?.length) {
      return res.status(400).json({
        success: false,
        message: "channel does not exists",
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, channel[0], "User fetched successfully"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "something went wrong while get user channle profile" || error?.message,
    });
  }
});

const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullname: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user[0].watchHistory,
          "Watch history fetched successfully"
        )
      );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while get watch History" || error?.message,
    });
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePasswordCurrent,
  getCurrectUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
