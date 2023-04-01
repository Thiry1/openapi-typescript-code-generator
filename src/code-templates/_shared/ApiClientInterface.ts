import ts from "typescript";

import type { TsGenerator } from "../../api";
import type { CodeGenerator } from "../../types";
import type { Option } from "./types";

const httpMethodList: string[] = ["GET", "PUT", "POST", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE"];

const createErrorResponsesTypeAlias = (typeName: string, factory: TsGenerator.Factory.Type, errorResponseNames: string[]) => {
  if (errorResponseNames.length === 0) {
    return factory.TypeAliasDeclaration.create({
      export: true,
      name: typeName,
      type: ts.factory.createToken(ts.SyntaxKind.VoidKeyword),
    });
  }
  return factory.TypeAliasDeclaration.create({
    export: true,
    name: typeName,
    type: factory.UnionTypeNode.create({
      typeNodes: errorResponseNames.map(name => {
        return factory.TypeReferenceNode.create({
          name,
        });
      }),
    }),
  });
};

const createSuccessResponseTypeAlias = (typeName: string, factory: TsGenerator.Factory.Type, successResponseNames: string[]) => {
  if (successResponseNames.length === 0) {
    return factory.TypeAliasDeclaration.create({
      export: true,
      name: typeName,
      type: ts.factory.createToken(ts.SyntaxKind.VoidKeyword),
    });
  }
  return factory.TypeAliasDeclaration.create({
    export: true,
    name: typeName,
    type: factory.UnionTypeNode.create({
      typeNodes: successResponseNames.map(name => {
        return factory.TypeReferenceNode.create({
          name,
        });
      }),
    }),
  });
};

const createHttpMethod = (factory: TsGenerator.Factory.Type) => {
  return factory.TypeAliasDeclaration.create({
    export: true,
    name: "HttpMethod",
    type: factory.TypeNode.create({ type: "string", enum: httpMethodList }),
  });
};

const createQueryParamsDeclarations = (factory: TsGenerator.Factory.Type) => {
  const queryParameterDeclaration = factory.InterfaceDeclaration.create({
    export: true,
    name: "QueryParameter",
    members: [
      factory.PropertySignature.create({
        name: "value",
        optional: false,
        type: factory.TypeNode.create({ type: "any" }),
      }),
      factory.PropertySignature.create({
        name: "style",
        optional: true,
        type: factory.TypeNode.create({ type: "string", enum: ["form", "spaceDelimited", "pipeDelimited", "deepObject"] }),
      }),
      factory.PropertySignature.create({
        name: "explode",
        optional: false,
        type: factory.TypeNode.create({ type: "boolean" }),
      }),
    ],
  });
  const queryParametersDeclaration = factory.InterfaceDeclaration.create({
    export: true,
    name: "QueryParameters",
    members: [
      factory.IndexSignatureDeclaration.create({
        name: "key",
        type: factory.TypeReferenceNode.create({ name: "QueryParameter" }),
      }),
    ],
  });

  return [queryParameterDeclaration, queryParametersDeclaration];
};

const createObjectLikeInterface = (factory: TsGenerator.Factory.Type) => {
  return factory.InterfaceDeclaration.create({
    export: true,
    name: "ObjectLike",
    members: [
      factory.IndexSignatureDeclaration.create({
        name: "key",
        type: factory.TypeNode.create({ type: "any" }),
      }),
    ],
  });
};

export const create = (factory: TsGenerator.Factory.Type, list: CodeGenerator.Params[], option: Option): ts.Statement[] => {
  const objectLikeOrAnyType = factory.UnionTypeNode.create({
    typeNodes: [
      factory.TypeReferenceNode.create({
        name: "ObjectLike",
      }),
      factory.TypeNode.create({
        type: "any",
      }),
    ],
  });

  const requestArgs = factory.ParameterDeclaration.create({
    name: "requestArgs",
    type: factory.TypeReferenceNode.create({
      name: "RequestArgs",
    }),
  });
  const options = factory.ParameterDeclaration.create({
    name: "options",
    optional: true,
    type: factory.TypeReferenceNode.create({
      name: "RequestOption",
    }),
  });

  const successResponseNames = list.map(item => item.convertedParams.responseSuccessNames).flat();

  const errorResponseNamespace = factory.Namespace.create({
    export: true,
    name: "ErrorResponse",
    statements: list.map(item => {
      return createErrorResponsesTypeAlias(`${item.convertedParams.escapedOperationId}`, factory, item.convertedParams.responseErrorNames);
    }),
  });

  const returnType = option.sync
    ? factory.TypeReferenceNode.create({
        name: "T",
      })
    : factory.TypeReferenceNode.create({
        name: "Promise",
        typeArguments: [
          factory.TypeReferenceNode.create({
            name: "T",
          }),
        ],
      });

  const functionType = factory.FunctionTypeNode.create({
    typeParameters: [
      factory.TypeParameterDeclaration.create({
        name: "T",
        defaultType: factory.TypeReferenceNode.create({
          name: "SuccessResponses",
        }),
      }),
    ],
    parameters: [requestArgs, options],
    type: returnType,
  });

  const requestFunction = factory.PropertySignature.create({
    name: "request",
    optional: false,
    type: functionType,
  });

  const requestArgsInterfaceDeclaration = factory.InterfaceDeclaration.create({
    export: true,
    name: "RequestArgs",
    members: [
      factory.PropertySignature.create({
        name: `httpMethod`,
        optional: false,
        type: factory.TypeReferenceNode.create({ name: "HttpMethod" }),
      }),
      factory.PropertySignature.create({
        name: `url`,
        optional: false,
        type: factory.TypeReferenceNode.create({ name: "string" }),
      }),
      factory.PropertySignature.create({
        name: `headers`,
        optional: false,
        type: objectLikeOrAnyType,
      }),
      factory.PropertySignature.create({
        name: `requestBody`,
        optional: false,
        type: objectLikeOrAnyType,
      }),
      factory.PropertySignature.create({
        name: `queryParameters`,
        optional: false,
        type: factory.UnionTypeNode.create({
          typeNodes: [
            factory.TypeReferenceNode.create({
              name: "QueryParameters",
            }),
            factory.TypeNode.create({ type: "undefined" }),
          ],
        }),
      }),
    ],
    typeParameters: [],
  });

  return [
    createHttpMethod(factory),
    createObjectLikeInterface(factory),
    ...createQueryParamsDeclarations(factory),
    createSuccessResponseTypeAlias("SuccessResponses", factory, successResponseNames),
    errorResponseNamespace,
    requestArgsInterfaceDeclaration,
    factory.InterfaceDeclaration.create({
      export: true,
      name: "ApiClient",
      members: [requestFunction],
      typeParameters: [
        factory.TypeParameterDeclaration.create({
          name: "RequestOption",
        }),
      ],
    }),
  ];
};
