"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const ApiError_1 = require("../utils/ApiError");
const validate = (schema, target = "body") => {
    return (req, _res, next) => {
        const parsed = schema.safeParse(req[target]);
        if (!parsed.success) {
            throw new ApiError_1.ApiError(400, "Validation failed", parsed.error.flatten());
        }
        if (target === "body") {
            req.body = parsed.data;
        }
        else if (target === "query") {
            Object.assign(req.query, parsed.data);
        }
        else {
            Object.assign(req.params, parsed.data);
        }
        next();
    };
};
exports.validate = validate;
