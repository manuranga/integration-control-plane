/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { ClusterPod, Hpa, HpaMetric, HpaWriteData, HttpScaler, HttpScalerWriteData, PodMetrics, ScalingMethodToggle, ScalingPath, ScalingState } from '../types/scaling';

const ni = (name: string): Promise<never> => Promise.reject(new Error(`[cloud] scaling.${name}: not implemented`));

export const getScalingState = (_orgUuid: string, _projectId: string, _componentId: string, _releaseId: string): Promise<ScalingState> => ni('getScalingState');
export const getHttpScaler = (_orgUuid: string, _projectId: string, _componentId: string, _releaseId: string): Promise<HttpScaler | null> => ni('getHttpScaler');
export const getHpa = (_orgUuid: string, _projectId: string, _componentId: string, _releaseId: string): Promise<Hpa | null> => ni('getHpa');
export const setScalingMethod = (_orgUuid: string, _projectId: string, _path: ScalingPath, _data: ScalingMethodToggle): Promise<void> => ni('setScalingMethod');
export const updateHttpScaler = (_orgUuid: string, _projectId: string, _path: ScalingPath, _data: HttpScalerWriteData): Promise<HttpScaler> => ni('updateHttpScaler');
export const createHpa = (_orgUuid: string, _projectId: string, _path: ScalingPath, _data: HpaWriteData): Promise<Hpa> => ni('createHpa');
export const updateHpa = (_orgUuid: string, _projectId: string, _path: ScalingPath, _hpaId: string, _data: HpaWriteData): Promise<Hpa> => ni('updateHpa');
export const createHpaMetric = (_orgUuid: string, _projectId: string, _path: ScalingPath, _hpaId: string, _data: HpaMetric): Promise<HpaMetric> => ni('createHpaMetric');
export const updateHpaMetric = (_orgUuid: string, _projectId: string, _path: ScalingPath, _hpaId: string, _metricId: string, _data: HpaMetric): Promise<HpaMetric> => ni('updateHpaMetric');
export const deleteHpaMetric = (_orgUuid: string, _projectId: string, _path: ScalingPath, _hpaId: string, _metricId: string): Promise<void> => ni('deleteHpaMetric');
export const listPods = (_orgUuid: string, _projectId: string, _clusterId: string, _releaseId: string): Promise<ClusterPod[]> => ni('listPods');
export const listPodMetrics = (_orgUuid: string, _projectId: string, _clusterId: string, _releaseId: string): Promise<PodMetrics[]> => ni('listPodMetrics');
