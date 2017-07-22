FOR %%i in (*.json) do if not %%i == Animations.json (
	type %%i | jq "" > %%i.R
	type %%i.R > %%i
	del %%i.R
)