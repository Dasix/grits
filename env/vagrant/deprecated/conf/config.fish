# Change the default fish prompt to something a bit more abbreviated
function fish_prompt --description 'Write out the prompt'
        # Just calculate this once, to save a few cycles when displaying the prompt
        if not set -q __fish_prompt_hostname
                set -g __fish_prompt_hostname (hostname|cut -d . -f 1)
        end

        set -l color_cwd
        set -l suffix
        switch $USER
        case root toor
                if set -q fish_color_cwd_root
                        set color_cwd $fish_color_cwd_root
                else
                        set color_cwd $fish_color_cwd
                end

                #set suffix '#'
                set suffix '>'

        case '*'
                set color_cwd $fish_color_cwd
                set suffix '>'
        end

        #echo -n -s "$USER" @ "$__fish_prompt_hostname" ' ' (set_color $color_cwd) (prompt_pwd) (set_color normal) "$suffix "

        echo -n -s (set_color -o $color_cwd) (prompt_pwd) "$suffix " (set_color normal)

end

# A preconfigured ls variation that suits me
function lk
	echo ""
	echo ""
	echo -s (set_color -o cyan) ">> List " (set_color -o blue) (pwd) (set_color -o cyan) " " (set_color normal)
	echo -s (set_color red) "------------------------------------------" (set_color normal)
	ls -lAgh --group-directories-first --no-group --time-style='+ ' -d * .*
	echo ""
	echo ""
end

# Show directory info
echo ""
echo ""
lk
echo ""
echo ""
