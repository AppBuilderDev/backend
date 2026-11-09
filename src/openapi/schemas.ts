import { z } from 'zod';
import type { SchemaObject } from '@nestjs/swagger';
import { entityInputSchema } from '../models/data.ts';
import { endpointInputSchema, endpointSchema } from '../models/endpoints.ts';
import { inventoryConfigInput, movementInput } from '../models/inventory.ts';
export const ref = (name: string) => ({ $ref: '#/components/schemas/' + name });
const convert = (schema: z.ZodType): SchemaObject => {
  const { $schema, ...value } = z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' });
  void $schema;
  return value as SchemaObject;
};
const object: SchemaObject = { type: 'object', additionalProperties: true };
export const schemas: Record<string, SchemaObject> = {
  EntityInput: convert(entityInputSchema),
  EndpointInput: convert(endpointInputSchema),
  Endpoint: convert(endpointSchema),
  EndpointUpdate: {
    allOf: [
      ref('EndpointInput'),
      {
        type: 'object',
        required: ['revision'],
        properties: { revision: { type: 'integer', minimum: 1, example: 1 } },
      },
    ],
  },
  Register: {
    type: 'object',
    required: ['name', 'email', 'password', 'organization'],
    properties: {
      name: { type: 'string', example: 'Mi nombre' },
      email: { type: 'string', format: 'email', example: 'usuario@example.com' },
      password: {
        type: 'string',
        minLength: 12,
        format: 'password',
        example: 'Clave-de-prueba-1234',
      },
      organization: { type: 'string', example: 'Mi organizacion' },
    },
  },
  Login: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'usuario@example.com' },
      password: { type: 'string', format: 'password', example: 'Clave-de-prueba-1234' },
    },
  },
  Session: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } },
      },
      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Usa este ID como projectId' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'editor', 'reader'] },
          },
        },
      },
    },
  },
  Error: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string' },
      fields: { type: 'object', additionalProperties: { type: 'string' } },
    },
  },
  ComponentNode: {
    type: 'object',
    required: ['id', 'type', 'props'],
    properties: {
      id: { type: 'string' },
      type: { type: 'string' },
      props: object,
      children: { type: 'array', items: ref('ComponentNode') },
    },
  },
  PageInput: {
    type: 'object',
    required: ['name', 'code', 'status', 'components'],
    properties: {
      name: { type: 'string', example: 'Inicio' },
      code: { type: 'string', example: 'inicio' },
      status: {
        type: 'string',
        enum: ['draft', 'published'],
        description: 'Publicar requiere rol owner',
      },
      components: { type: 'array', items: ref('ComponentNode') },
      revision: { type: 'integer', minimum: 1, description: 'Obligatoria al actualizar' },
    },
  },
  ResourceRecord: {
    type: 'object',
    additionalProperties: true,
    properties: { id: { type: 'string' }, revision: { type: 'integer', minimum: 1 } },
    description: 'Campos del recurso en el nivel raiz, mas id y revision',
  },
  ResourceList: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('ResourceRecord') },
      total: { type: 'integer' },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
    },
  },
  ResourceCreate: { ...object, example: { nombre: 'Producto de prueba' } },
  ResourceUpdate: {
    ...object,
    required: ['revision'],
    properties: { revision: { type: 'integer', minimum: 1 } },
    example: { nombre: 'Producto actualizado', revision: 1 },
  },
  RecordWrite: {
    type: 'object',
    required: ['values'],
    properties: { values: object, revision: { type: 'integer', minimum: 1 } },
    example: { values: { nombre: 'Producto' }, revision: 1 },
  },
  InventoryConfig: convert(inventoryConfigInput),
  Movement: convert(movementInput),
};
export const resourceExample = {
  name: 'Productos',
  key: 'productos',
  labelField: 'nombre',
  fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }],
};
export const endpointExample = {
  name: 'Listar productos',
  method: 'GET',
  path: '/api/v1/projects/{projectId}/resources/productos',
  itemsPath: 'items',
  fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }],
};
