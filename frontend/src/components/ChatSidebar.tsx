import { AnimatePresence, motion } from "framer-motion";
import { SidebarContent } from "./SidebarContent";

interface ChatSidebarProps {
	conversations: import("../types").Conversation[];
	selectedId: string | null;
	loading: boolean;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (id: string) => void;
	open: boolean;
	onToggle: () => void;
	isMobile: boolean;
}

export function ChatSidebar(props: ChatSidebarProps) {
	const { open, onToggle, isMobile, ...contentProps } = props;

	if (isMobile) {
		return (
			<AnimatePresence>
				{open && (
					<>
						<motion.div
							key="sidebar-backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-50 bg-black/40"
							onClick={onToggle}
						/>
						<motion.div
							key="sidebar-panel"
							initial={{ x: "-100%" }}
							animate={{ x: 0 }}
							exit={{ x: "-100%" }}
							transition={{ duration: 0.2, ease: "easeInOut" }}
							className="fixed top-0 left-0 z-50 h-full w-[280px] max-w-[80vw] shadow-xl"
						>
							<SidebarContent {...contentProps} />
						</motion.div>
					</>
				)}
			</AnimatePresence>
		);
	}

	return (
		<div
			style={{ width: open ? 250 : 0 }}
			className="h-full flex-shrink-0 overflow-hidden border-r border-neutral-200 transition-[width] duration-200 ease-in-out"
		>
			<SidebarContent {...contentProps} />
		</div>
	);
}
