class ApiResponse {
    constructor(statusCode, data, messege = "success"){
        this.statusCode = statusCode
        this.messege = messege
        this.data = data
        this.success = statusCode < 400

    }
}

export {ApiResponse}