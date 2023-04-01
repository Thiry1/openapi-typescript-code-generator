import ts from "typescript";

import type { TsGenerator } from "../../../api";
import type { CodeGenerator } from "../../../types";
import * as Utils from "../utils";
import type { MethodType } from "./types";

export interface Params {
  httpMethod: string;
  hasRequestBody: boolean;
}

/**
 *
 * const encodingMap = {
 *   "application/json": {},
 *   "application/x-www-form-urlencoded": {},
 * }
 */
const createEncodingParams = (factory: TsGenerator.Factory.Type, params: CodeGenerator.Params): ts.Expression => {
  const content = params.operationParams.requestBody?.content;
  if (!content) {
    return factory.Identifier.create({ name: "undefined" });
  }
  if (params.convertedParams.has2OrMoreRequestContentTypes) {
    return factory.Identifier.create({ name: `requestEncodings[params.headers["Content-Type"]]` });
  }
  return factory.Identifier.create({ name: `requestEncodings["${params.convertedParams.requestFirstContentType}"]` });
};

/**
 * this.apiClient.request("GET", url, requestBody, headers, queryParameters);
 */
export const create = (factory: TsGenerator.Factory.Type, params: CodeGenerator.Params, methodType: MethodType): ts.CallExpression => {
  const { convertedParams } = params;
  const apiClientVariableIdentifier: Record<MethodType, string> = {
    class: "this.apiClient.request",
    function: "apiClient.request",
  };
  const expression = Utils.generateVariableIdentifier(factory, apiClientVariableIdentifier[methodType]);

  const requestArgs = factory.ObjectLiteralExpression.create({
    properties: [
      factory.PropertyAssignment.create({
        name: "httpMethod",
        initializer: factory.StringLiteral.create({ text: params.operationParams.httpMethod.toUpperCase() }),
      }),
      factory.PropertyAssignment.create({
        name: "url",
        initializer: factory.Identifier.create({ name: "url" }),
      }),
      factory.PropertyAssignment.create({
        name: "headers",
        initializer: factory.Identifier.create({ name: "headers" }),
      }),
      factory.PropertyAssignment.create({
        name: "requestBody",
        initializer: convertedParams.hasRequestBody
          ? Utils.generateVariableIdentifier(factory, "params.requestBody")
          : factory.Identifier.create({ name: "undefined" }),
      }),
      factory.PropertyAssignment.create({
        name: "requestBodyEncoding",
        initializer: createEncodingParams(factory, params),
      }),
      factory.PropertyAssignment.create({
        name: "queryParameters",
        initializer: convertedParams.hasQueryParameters
          ? factory.Identifier.create({ name: "queryParameters" })
          : factory.Identifier.create({ name: "undefined" }),
      }),
    ],
    multiLine: true,
  });

  const argumentsArray = [requestArgs, factory.Identifier.create({ name: "option" })];

  return factory.CallExpression.create({
    expression: expression,
    typeArguments: [],
    argumentsArray: argumentsArray,
  });
};
