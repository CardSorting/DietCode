import { StateServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import Fuse from "fuse.js";
import type React from "react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { highlight } from "@/utils/highlight";

// Star icon for favorites
export const StarIcon = ({
	isFavorite,
	onClick,
}: { isFavorite: boolean; onClick: (e: React.MouseEvent) => void }) => {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: "none",
				border: "none",
				padding: 0,
				cursor: "pointer",
				color: isFavorite ? "var(--vscode-terminal-ansiBlue)" : "var(--vscode-descriptionForeground)",
				marginLeft: "8px",
				fontSize: "16px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				userSelect: "none",
				WebkitUserSelect: "none",
			}}
		>
			{isFavorite ? "★" : "☆"}
		</button>
	);
};

export interface FuzzyModelPickerProps {
	selectedModelId: string;
	onModelChange: (modelId: string) => void;
	modelIds: string[];
	favoritedModelIds?: string[];
	placeholder?: string;
	zIndex?: number;
}

export const FuzzyModelPicker: React.FC<FuzzyModelPickerProps> = ({
	selectedModelId,
	onModelChange,
	modelIds,
	favoritedModelIds = [],
	placeholder = "Search and select a model...",
	zIndex = 1000,
}) => {
	const [searchTerm, setSearchTerm] = useState(selectedModelId);
	const [isDropdownVisible, setIsDropdownVisible] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	const dropdownListRef = useRef<HTMLDivElement>(null);

	// Sync external changes when the selectedModelId changes
	useEffect(() => {
		setSearchTerm(selectedModelId);
	}, [selectedModelId]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownVisible(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const searchableItems = useMemo(() => {
		return modelIds.map((id) => ({
			id,
			label: id, // Adding label for highlighting
		}));
	}, [modelIds]);

	const fuse = useMemo(() => {
		return new Fuse(searchableItems, {
			keys: ["id"],
			threshold: 0.6,
			shouldSort: true,
			isCaseSensitive: false,
			ignoreLocation: false,
			includeMatches: true,
			minMatchCharLength: 1,
		});
	}, [searchableItems]);

	const modelSearchResults = useMemo(() => {
		// First, get all favorited models
		const favoritedModels = searchableItems.filter((item) => favoritedModelIds.includes(item.id)).map(item => ({ ...item, parts: [{ text: item.id, highlighted: false }] }));

		// Then get search results for non-favorited models
		const searchResults = searchTerm
			? (highlight(fuse.search(searchTerm)) as unknown as Array<{ id: string; parts: Array<{ text: string; highlighted: boolean }> }>).filter((item) => !favoritedModelIds.includes(item.id))
			: searchableItems.filter((item) => !favoritedModelIds.includes(item.id)).map(item => ({ ...item, parts: [{ text: item.id, highlighted: false }] }));

		// Combine favorited models with search results
		return [...favoritedModels, ...searchResults];
	}, [searchableItems, searchTerm, fuse, favoritedModelIds]);

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (!isDropdownVisible) {
			return;
		}

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setSelectedIndex((prev) => (prev < modelSearchResults.length - 1 ? prev + 1 : prev));
				break;
			case "ArrowUp":
				event.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
				break;
			case "Enter":
				event.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < modelSearchResults.length) {
					onModelChange(modelSearchResults[selectedIndex].id);
					setIsDropdownVisible(false);
				} else {
					onModelChange(searchTerm);
					setIsDropdownVisible(false);
				}
				break;
			case "Escape":
				setIsDropdownVisible(false);
				setSelectedIndex(-1);
				break;
		}
	};

	useEffect(() => {
		setSelectedIndex(-1);
		if (dropdownListRef.current) {
			dropdownListRef.current.scrollTop = 0;
		}
	}, []);

	useEffect(() => {
		if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
			itemRefs.current[selectedIndex]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}
	}, [selectedIndex]);

	return (
		<div style={{ width: "100%" }}>
			<style>
				{`
				.model-item-highlight {
					background-color: var(--vscode-editor-findMatchHighlightBackground);
					color: inherit;
				}
				`}
			</style>
			<DropdownWrapper ref={dropdownRef}>
				<VSCodeTextField
					id="model-search"
					onBlur={() => {
						if (searchTerm !== selectedModelId) {
							onModelChange(searchTerm);
						}
					}}
					onFocus={() => setIsDropdownVisible(true)}
					onInput={(e) => {
						setSearchTerm((e.target as HTMLInputElement)?.value.toLowerCase() || "");
						setIsDropdownVisible(true);
					}}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					// biome-ignore lint/a11y/useSemanticElements: Custom search dropdown requires non-standard structure
					role="combobox"
					style={{
						width: "100%",
						zIndex,
						position: "relative",
					}}
					value={searchTerm}
				>
					{searchTerm && (
						<button
							type="button"
							aria-label="Clear search"
							className="input-icon-button codicon codicon-close"
							onClick={() => {
								setSearchTerm("");
								setIsDropdownVisible(true);
							}}
							slot="end"
							style={{
								background: "none",
								border: "none",
								padding: 0,
								cursor: "pointer",
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%",
							}}
						/>
					)}
				</VSCodeTextField>
				{isDropdownVisible && (
					<DropdownList
						ref={dropdownListRef}
						// biome-ignore lint/a11y/useSemanticElements: Custom search dropdown requires non-standard structure
						role="listbox"
						style={{ zIndex: zIndex - 1 }}
					>
						{modelSearchResults.map((item, index) => {
							const isFavorite = favoritedModelIds.includes(item.id);
							return (
								<DropdownItem
									isSelected={index === selectedIndex}
									key={item.id}
									onClick={() => {
										onModelChange(item.id);
										setIsDropdownVisible(false);
									}}
									onMouseEnter={() => setSelectedIndex(index)}
									ref={(el) => {
										itemRefs.current[index] = el;
									}}
									// biome-ignore lint/a11y/useSemanticElements: Custom search dropdown requires non-standard structure
									role="option"
									aria-selected={index === selectedIndex}
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onModelChange(item.id);
											setIsDropdownVisible(false);
										}
									}}
								>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
										}}
									>
										<span>
											{item.parts?.map((part: { text: string; highlighted: boolean }, i: number) => (
												<span
													key={`${part.text}-${i}`}
													className={part.highlighted ? "model-item-highlight" : ""}
												>
													{part.text}
												</span>
											))}
										</span>
										<StarIcon
											isFavorite={isFavorite}
											onClick={(e) => {
												e.stopPropagation();
												StateServiceClient.toggleFavoriteModel(StringRequest.create({ value: item.id })).catch(
													(error) => console.error("Failed to toggle favorite model:", error),
												);
											}}
										/>
									</div>
								</DropdownItem>
							);
						})}
					</DropdownList>
				)}
			</DropdownWrapper>
		</div>
	);
};



const DropdownWrapper = styled.div`
	position: relative;
	width: 100%;
`;

const DropdownList = styled.div`
	position: absolute;
	top: calc(100% - 3px);
	left: 0;
	width: calc(100% - 2px);
	max-height: 200px;
	overflow-y: auto;
	background-color: var(--vscode-dropdown-background);
	border: 1px solid var(--vscode-list-activeSelectionBackground);
	border-bottom-left-radius: 3px;
	border-bottom-right-radius: 3px;
	z-index: 1000;
`;

const DropdownItem = styled.div<{ isSelected: boolean }>`
	padding: 5px 10px;
	cursor: pointer;
	word-break: break-all;
	white-space: normal;

	background-color: ${({ isSelected }) => (isSelected ? "var(--vscode-list-activeSelectionBackground)" : "inherit")};

	&:hover {
		background-color: var(--vscode-list-activeSelectionBackground);
	}
`;
