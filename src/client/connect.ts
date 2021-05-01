import { RpcClient, SocketTransport } from 'roots-rpc';
import { Calls } from '../rpc/rpcCalls';

const socket = io();

const client = new RpcClient(new SocketTransport(socket));
export const getMapboxToken = client.connect(Calls.GetMapboxToken);
export const getMapBounds = client.connect(Calls.GetMapBounds);
export const getMapCenter = client.connect(Calls.GetMapCenter);
export const getTreeInfoAtPoint = client.connect(Calls.GetTreeInfoAtPoint);
