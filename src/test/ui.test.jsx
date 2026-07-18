import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Modal } from '../components/ui';
import { ProjectCard } from '../pages/ProjectsPage';

describe('accessible modal', () => {
  it('renders its title and closes with Escape', () => { const close=vi.fn(); render(<Modal open onClose={close} title="Create task"><button>Save</button></Modal>); expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(screen.getByText('Create task')).toBeInTheDocument(); fireEvent.keyDown(document,{key:'Escape'}); expect(close).toHaveBeenCalled(); });
});
describe('project card', () => {
  it('opens the board when the project card is clicked', () => { const project={id:'p1',name:'Portal Refresh',description:'Customer project',color:'#FF745F',status:'active',completionPercentage:65,teamMembers:[]}; render(<MemoryRouter initialEntries={['/projects']}><Routes><Route path="/projects" element={<ProjectCard project={project} view="grid" onEdit={()=>{}}/>}/><Route path="/projects/:projectId/board" element={<p>Project board opened</p>}/></Routes></MemoryRouter>); expect(screen.getByText('65%')).toBeInTheDocument(); expect(screen.getByText('active')).toBeInTheDocument(); fireEvent.click(screen.getByRole('link',{name:'Open Portal Refresh'})); expect(screen.getByText('Project board opened')).toBeInTheDocument(); });
  it('opens edit without navigating to the board', () => { const edit=vi.fn(); const project={id:'p1',name:'Portal Refresh',description:'Customer project',color:'#FF745F',status:'active',completionPercentage:65,teamMembers:[]}; render(<MemoryRouter><ProjectCard project={project} view="grid" onEdit={edit}/></MemoryRouter>); fireEvent.click(screen.getByRole('button',{name:'Edit project'})); expect(edit).toHaveBeenCalledWith(project); expect(screen.getByText('Portal Refresh')).toBeInTheDocument(); });
});
