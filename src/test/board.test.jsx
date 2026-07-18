import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks=vi.hoisted(()=>({create:vi.fn().mockResolvedValue({}),getBoard:vi.fn(),getProject:vi.fn(),members:vi.fn()}));
vi.mock('../api',()=>({
  tasksApi:{create:mocks.create,move:vi.fn(),bulk:vi.fn()},
  boardsApi:{get:mocks.getBoard,addColumn:vi.fn(),updateColumn:vi.fn(),removeColumn:vi.fn(),reorder:vi.fn()},
  projectsApi:{get:mocks.getProject},organisationsApi:{members:mocks.members},commentsApi:{},filesApi:{}
}));
vi.mock('../hooks/useSocket',()=>({useSocket:()=>null}));
import BoardPage,{TaskForm} from '../pages/BoardPage';
import { useAppStore } from '../store/useAppStore';

const Wrapper=({children})=><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{children}</QueryClientProvider>;
beforeEach(()=>{useAppStore.setState({organisation:{id:'org1',name:'Org',role:'manager'},user:{id:'u1',fullName:'User'}});mocks.members.mockResolvedValue({data:{data:{members:[]}}});mocks.getProject.mockResolvedValue({data:{data:{project:{id:'p1',name:'Release'}}}});mocks.getBoard.mockResolvedValue({data:{data:{board:{id:'b1'},columns:[{id:'c1',name:'To Do',position:0,color:'#75667D'},{id:'c2',name:'Done',position:1,color:'#3FB27F',isCompleted:true}],tasks:[{id:'t1',title:'Urgent fix',description:'',taskNumber:1,priority:'urgent',labels:[],assignees:[],columnId:{id:'c1'},position:0,checklist:[],createdAt:new Date().toISOString()},{id:'t2',title:'High priority',description:'',taskNumber:2,priority:'high',labels:[],assignees:[],columnId:{id:'c1'},position:1,checklist:[],createdAt:new Date().toISOString()}]}}});});
describe('task creation and Kanban filters',()=>{
  it('submits the task form to the API',async()=>{const close=vi.fn();render(<Wrapper><TaskForm open onClose={close} columns={[{id:'c1',name:'To Do'}]} projectId="p1"/></Wrapper>);const user=userEvent.setup();await user.type(document.querySelector('input[name="title"]'),'Create release notes');await user.type(screen.getByPlaceholderText('frontend, bug, release'),'release, docs');await user.click(screen.getByRole('button',{name:/create task/i}));await waitFor(()=>expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({title:'Create release notes',projectId:'p1',columnId:'c1',labels:expect.arrayContaining([expect.objectContaining({name:'release'})])})));});
  it('renders Kanban columns and filters tasks by priority',async()=>{render(<Wrapper><MemoryRouter initialEntries={['/projects/p1/board']}><Routes><Route path="/projects/:projectId/board" element={<BoardPage/>}/></Routes></MemoryRouter></Wrapper>);expect(await screen.findByText('Urgent fix')).toBeInTheDocument();expect(screen.getByText('High priority')).toBeInTheDocument();const user=userEvent.setup();const filters=screen.getAllByRole('combobox');await user.selectOptions(filters.find(node=>[...node.options].some(option=>option.text==='All priorities')),'high');expect(screen.queryByText('Urgent fix')).not.toBeInTheDocument();expect(screen.getByText('High priority')).toBeInTheDocument();expect(screen.getAllByText('To Do').length).toBeGreaterThan(0);expect(screen.getAllByText('Done').length).toBeGreaterThan(0);});
});
