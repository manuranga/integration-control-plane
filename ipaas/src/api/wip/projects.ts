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

import { gql } from './graphql';
import type { Project, ProjectContributor, ProjectHandlerAvailability, CreateProjectInput, CreateMonoRepoProjectInput, LinkProjectRepositoryInput, UpdateProjectInput } from '../../types/project';

const PROJECT_FIELDS = 'id, orgId, name, handler, description, version, createdDate, updatedAt, region, type, defaultDeploymentPipelineId, gitOrganization, repository, branch, gitProvider, owner';

const PROJECTS_QUERY = `
  query GetProjects($orgId: Int!) {
    projects(orgId: $orgId) { ${PROJECT_FIELDS} }
  }`;

const PROJECT_QUERY = `
  query GetProject($orgId: Int!, $projectId: String!) {
    project(orgId: $orgId, projectId: $projectId) { ${PROJECT_FIELDS} }
  }`;

const PROJECT_BY_HANDLER_QUERY = `
  query GetProjectByHandler($orgId: Int!, $projectHandler: String!) {
    projectByHandler(orgId: $orgId, projectHandler: $projectHandler) { ${PROJECT_FIELDS} }
  }`;

const PROJECT_CONTRIBUTORS_QUERY = `
  query GetProjectContributors($orgId: Int!, $projectId: String!) {
    project(orgId: $orgId, projectId: $projectId) {
      projectContributorsData {
        contributorCount
        contributors { id, pictureUrl, email, displayName, totalContributions }
      }
    }
  }`;

const PROJECT_COMPONENT_LABELS_QUERY = `
  query GetProjectComponentLabels($projectId: String!, $orgId: Int!) {
    projectComponentLabels(projectId: $projectId, orgId: $orgId)
  }`;

const PROJECT_HANDLER_AVAILABILITY_QUERY = `
  query ProjectHandlerAvailability($orgId: Int!, $projectHandlerCandidate: String!) {
    projectHandlerAvailability(orgId: $orgId, projectHandlerCandidate: $projectHandlerCandidate) {
      handlerUnique
      alternateHandlerCandidate
    }
  }`;

const CREATE_PROJECT = `
  mutation CreateProject($name: String!, $description: String!, $projectHandler: String!, $orgHandler: String!, $orgId: Int!) {
    createProject(project: {
      name: $name,
      description: $description,
      projectHandler: $projectHandler,
      orgId: $orgId,
      orgHandler: $orgHandler,
      version: "1.0.0"
    }) {
      id, orgId, name, version, createdDate, handler, region,
      description, defaultDeploymentPipelineId, deploymentPipelineIds,
      type, updatedAt
    }
  }`;

const CREATE_MONO_REPO_PROJECT = `
  mutation CreateMonoRepoProject(
    $name: String!, $description: String!, $projectHandler: String!,
    $orgHandler: String!, $orgId: Int!,
    $repository: String!, $gitOrganization: String!, $branch: String!,
    $directoryPath: String!, $gitProvider: String!, $isPublicRepo: Boolean!, $secretRef: String!
  ) {
    createProject(project: {
      name: $name,
      description: $description,
      projectHandler: $projectHandler,
      orgId: $orgId,
      orgHandler: $orgHandler,
      version: "1.0.0",
      repository: $repository,
      secretRef: $secretRef,
      branch: $branch,
      gitProvider: $gitProvider,
      gitOrganization: $gitOrganization,
      directoryPath: $directoryPath,
      isPublicRepo: $isPublicRepo
    }) {
      id, orgId, name, version, createdDate, handler, region,
      description, defaultDeploymentPipelineId, deploymentPipelineIds,
      type, updatedAt
    }
  }`;

const CREATE_PROJECT_REPOSITORY = `
  mutation CreateProjectRepository(
    $name: String!, $description: String!, $projectHandler: String!,
    $orgHandler: String!, $orgId: Int!, $projectId: String!,
    $repository: String!, $secretRef: String!, $gitOrganization: String!,
    $branch: String!, $directoryPath: String!, $gitProvider: String!, $isPublicRepo: Boolean!
  ) {
    createProjectRepository(project: {
      name: $name,
      description: $description,
      projectHandler: $projectHandler,
      orgId: $orgId,
      orgHandler: $orgHandler,
      version: "1.0.0",
      repository: $repository,
      secretRef: $secretRef,
      branch: $branch,
      gitProvider: $gitProvider,
      gitOrganization: $gitOrganization,
      directoryPath: $directoryPath,
      isPublicRepo: $isPublicRepo
    }, projectId: $projectId) {
      id, orgId, name, version, createdDate, handler, region,
      description, defaultDeploymentPipelineId, deploymentPipelineIds,
      type, updatedAt, branch, repository, gitProvider, gitOrganization
    }
  }`;

export async function fetchProjects(orgId: number): Promise<Project[]> {
  return gql<{ projects: Project[] }>(PROJECTS_QUERY, { orgId }).then((d) => d.projects ?? []);
}

export async function fetchProject(orgId: number, projectId: string): Promise<Project> {
  return gql<{ project: Project }>(PROJECT_QUERY, { orgId, projectId }).then((d) => d.project);
}

export async function fetchProjectByHandler(orgId: number, projectHandler: string): Promise<Project> {
  return gql<{ projectByHandler: Project }>(PROJECT_BY_HANDLER_QUERY, { orgId, projectHandler }).then((d) => d.projectByHandler);
}

export async function fetchProjectContributors(orgId: number, projectId: string): Promise<ProjectContributor[]> {
  return gql<{ project: { projectContributorsData: { contributorCount: number; contributors: ProjectContributor[] } } }>(PROJECT_CONTRIBUTORS_QUERY, { orgId, projectId })
    .then((d) => d.project?.projectContributorsData?.contributors ?? [])
    .catch(() => []);
}

export async function fetchProjectComponentLabels(orgId: number, projectId: string): Promise<string[]> {
  return gql<{ projectComponentLabels: string[] }>(PROJECT_COMPONENT_LABELS_QUERY, { projectId, orgId }).then((d) => d.projectComponentLabels ?? []);
}

export async function fetchProjectHandlerAvailability(orgId: number, candidate: string): Promise<ProjectHandlerAvailability> {
  return gql<{ projectHandlerAvailability: ProjectHandlerAvailability }>(PROJECT_HANDLER_AVAILABILITY_QUERY, { orgId, projectHandlerCandidate: candidate }).then((d) => d.projectHandlerAvailability);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return gql<{ createProject: Project }>(CREATE_PROJECT, {
    name: input.name,
    description: input.description,
    projectHandler: input.handler,
    orgHandler: input.orgHandler,
    orgId: orgNumericId(),
  }).then((d) => d.createProject);
}

const UPDATE_PROJECT = `
  mutation UpdateProject($id: String!, $name: String!, $description: String!, $orgId: Int!, $version: String!) {
    updateProject(project: { id: $id, name: $name, description: $description, orgId: $orgId, version: $version }) {
      id, orgId, name, version, createdDate, handler, region,
      description, defaultDeploymentPipelineId, deploymentPipelineIds,
      type, updatedAt
    }
  }`;

const DELETE_PROJECT = `
  mutation DeleteProject($orgId: Int!, $projectId: String!) {
    deleteProject(orgId: $orgId, projectId: $projectId) { status }
  }`;

function orgNumericId(): number {
  const orgId = window.API_CONFIG.asgardeoOrgNumericId;
  if (orgId === undefined || !Number.isFinite(orgId)) throw new Error('API_CONFIG.asgardeoOrgNumericId is missing or invalid.');
  return orgId;
}

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  return gql<{ updateProject: Project }>(UPDATE_PROJECT, { id: input.id, name: input.name, description: input.description, version: input.version, orgId: orgNumericId() }).then((d) => d.updateProject);
}

export async function deleteProject(projectId: string): Promise<void> {
  await gql<{ deleteProject: { status: string } }>(DELETE_PROJECT, { orgId: orgNumericId(), projectId });
}

export async function createMonoRepoProject(input: CreateMonoRepoProjectInput): Promise<Project> {
  return gql<{ createProject: Project }>(CREATE_MONO_REPO_PROJECT, {
    name: input.name,
    description: input.description,
    projectHandler: input.handler,
    orgHandler: input.orgHandler,
    orgId: orgNumericId(),
    repository: input.repository,
    gitOrganization: input.gitOrganization,
    branch: input.branch,
    directoryPath: input.directoryPath,
    gitProvider: input.gitProvider,
    isPublicRepo: input.isPublicRepo,
    secretRef: input.secretRef ?? '',
  }).then((d) => d.createProject);
}

export async function linkProjectRepository(input: LinkProjectRepositoryInput): Promise<Project> {
  return gql<{ createProjectRepository: Project }>(CREATE_PROJECT_REPOSITORY, {
    name: input.name,
    description: input.description,
    projectHandler: input.handler,
    orgHandler: input.orgHandler,
    orgId: orgNumericId(),
    projectId: input.projectId,
    repository: input.repository,
    secretRef: input.secretRef ?? '',
    gitOrganization: input.gitOrganization,
    branch: input.branch,
    directoryPath: input.directoryPath,
    gitProvider: input.gitProvider,
    isPublicRepo: input.isPublicRepo,
  }).then((d) => d.createProjectRepository);
}
