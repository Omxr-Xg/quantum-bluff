import type { Meta, StoryObj } from '@storybook/react-vite';
import { PokerCard } from './PokerCard';

const meta = {
  title: 'Game/PokerCard',
  component: PokerCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    suit: {
      control: 'select',
      options: ['hearts', 'diamonds', 'clubs', 'spades'],
    },
    value: {
      control: 'select',
      options: ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    faceDown: { control: 'boolean' },
    highlight: { control: 'boolean' },
    colorblindMode: { control: 'boolean' },
  },
} satisfies Meta<typeof PokerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AceOfHearts: Story = {
  args: { suit: 'hearts', value: 'A', size: 'md' },
};

export const KingOfSpades: Story = {
  args: { suit: 'spades', value: 'K', size: 'md' },
};

export const TenOfDiamonds: Story = {
  args: { suit: 'diamonds', value: '10', size: 'md' },
};

export const FaceDown: Story = {
  args: { suit: 'hearts', value: 'A', faceDown: true },
};

export const Highlighted: Story = {
  args: { suit: 'clubs', value: 'Q', highlight: true },
};

export const ColorblindMode: Story = {
  args: { suit: 'hearts', value: 'K', colorblindMode: true },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4 items-end">
      <PokerCard suit="hearts" value="A" size="xs" />
      <PokerCard suit="hearts" value="A" size="sm" />
      <PokerCard suit="hearts" value="A" size="md" />
      <PokerCard suit="hearts" value="A" size="lg" />
    </div>
  ),
};
